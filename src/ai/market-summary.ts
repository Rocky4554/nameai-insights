import { completeText, LlmError } from "./client";
import type { BuiltReport } from "@/reports/domain-sales-report";
import type { ArticleType } from "@/lib/payload-client";
import { formatUsd } from "@/lib/format";

/**
 * Generates the "Market Summary" prose for a report — the one part of the
 * markdown the deterministic builder leaves as a placeholder (see
 * docs/PLAN.md § 4). The facts block (metrics + top-10 entries) stays the
 * single source of truth; this only writes sentences around it, and every
 * dollar figure it produces is checked against that block before use.
 */
export const MARKET_SUMMARY_PROMPT_VERSION = "v1";

export interface MarketSummaryResult {
  text: string;
  model: string;
  promptVersion: string;
}

function collectAllowedAmounts(built: BuiltReport): number[] {
  const metrics = built.metrics;
  const amounts: number[] = [];
  const push = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) amounts.push(v);
  };

  push(metrics.totalVolume);
  push(metrics.avgPrice);
  push(metrics.avgAmount);

  for (const key of ["topSale", "topRaise"] as const) {
    const top = metrics[key];
    if (top && typeof top === "object") {
      push((top as Record<string, unknown>).price);
      push((top as Record<string, unknown>).amount);
    }
  }

  for (const entry of built.topEntries) {
    push(entry.price);
    push(entry.amount);
  }

  return amounts;
}

function parseDollarAmount(raw: string): number | null {
  const m = raw.match(/\$\s?([\d,]+(?:\.\d+)?)\s?([kKmMbB])?/);
  if (!m) return null;
  const num = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const suffix = m[2]?.toLowerCase();
  const scale = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
  return num * scale;
}

function extractDollarAmounts(text: string): number[] {
  const matches = text.match(/\$\s?[\d,]+(?:\.\d+)?\s?[kKmMbB]?/g) ?? [];
  return matches.map(parseDollarAmount).filter((n): n is number => n !== null);
}

/** Rounded forms ("$85.9k" for 85900, "$3.4B" for 3.4e9) need slack; 3% (min $25) covers normal rounding without letting a materially different figure through. */
function isWithinTolerance(value: number, allowed: number[]): boolean {
  return allowed.some((a) => Math.abs(a - value) <= Math.max(25, a * 0.03));
}

function verifyNoInventedAmounts(text: string, allowedAmounts: number[]): boolean {
  return extractDollarAmounts(text).every((amount) => isWithinTolerance(amount, allowedAmounts));
}

/**
 * Every dollar amount is pre-formatted ("$85,900", not 85900) so the model
 * can copy strings verbatim instead of reformatting raw numbers itself --
 * the difference between "$72,000" and the literal 28633.333333333332
 * it would otherwise print.
 */
function formatFactsForPrompt(built: BuiltReport, type: ArticleType): Record<string, unknown> {
  const formatMoney = (v: unknown): string | undefined =>
    typeof v === "number" && Number.isFinite(v) ? formatUsd(v) : undefined;

  const metrics = built.metrics;
  const top = (metrics.topSale ?? metrics.topRaise) as Record<string, unknown> | null | undefined;
  const isSales = type === "domain-sales";

  return {
    count: metrics.count,
    totalVolumeFormatted: formatMoney(metrics.totalVolume),
    [isSales ? "avgPriceFormatted" : "avgRoundSizeFormatted"]: formatMoney(metrics.avgPrice ?? metrics.avgAmount),
    top: top
      ? {
          [isSales ? "domain" : "company"]: top.domain ?? top.company,
          amountFormatted: formatMoney(top.price ?? top.amount),
        }
      : null,
    entries: built.topEntries.map((entry) => ({
      [isSales ? "domain" : "company"]: entry.domain ?? entry.company,
      amountFormatted: formatMoney(entry.price ?? entry.amount) ?? "undisclosed",
      [isSales ? "marketplace" : "round"]: entry.marketplace ?? entry.round ?? undefined,
    })),
  };
}

function buildPrompt(built: BuiltReport, type: ArticleType, dateLabel: string) {
  const kind = type === "domain-sales" ? ".ai domain sales" : "AI startup funding";
  const system = [
    `You write a short, factual market-summary paragraph for a daily ${kind} report.`,
    `Output ONLY the paragraph body — no heading, no markdown bullets or lists, 2 to 4 sentences.`,
    `Every dollar figure you use MUST be copied character-for-character from an "...Formatted" field below (e.g. write "$72,000" exactly as given) — never compute, round, or reformat a number yourself.`,
    `Reference ONLY the names and figures present in the facts JSON. Never introduce a dollar figure, count, or name that isn't there. If you're not certain something is grounded in the facts, omit it rather than guess.`,
    `Neutral, analytical tone for founders and investors — no hype, no emoji, no exclamation points.`,
  ].join(" ");

  const facts = { date: dateLabel, ...formatFactsForPrompt(built, type) };
  const user = `Facts:\n${JSON.stringify(facts, null, 2)}\n\nWrite the market summary paragraph now.`;

  return { system, user };
}

/** Returns null (never throws) on any failure — missing key, rate limit, or a guardrail rejection — so callers can fall back to the deterministic placeholder. */
export async function generateMarketSummary(
  built: BuiltReport,
  type: ArticleType,
  dateLabel: string,
): Promise<MarketSummaryResult | null> {
  if (built.topEntries.length === 0) return null; // nothing happened today; no summary to write

  const { system, user } = buildPrompt(built, type, dateLabel);
  const allowedAmounts = collectAllowedAmounts(built);

  for (let attempt = 0; attempt < 2; attempt++) {
    let completion;
    try {
      completion = await completeText({
        system,
        user,
        maxTokens: 400,
        temperature: attempt === 0 ? 0.5 : 0.2,
      });
    } catch (err) {
      if (err instanceof LlmError) {
        console.warn(`[market-summary] generation failed (${err.code}): ${err.message}`);
        return null;
      }
      throw err;
    }

    if (verifyNoInventedAmounts(completion.text, allowedAmounts)) {
      return { text: completion.text, model: completion.model, promptVersion: MARKET_SUMMARY_PROMPT_VERSION };
    }

    console.warn(`[market-summary] guardrail rejected attempt ${attempt + 1}: dollar figure not grounded in facts`);
  }

  return null;
}
