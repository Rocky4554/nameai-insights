import { format } from "date-fns";
import { buildDomainSalesReport } from "@/reports/domain-sales-report";
import { buildFundingReport } from "@/reports/funding-report";
import { MARKET_SUMMARY_PLACEHOLDER } from "@/reports/shared";
import { generateMarketSummary } from "@/ai/market-summary";
import { upsertDraftArticle, type ArticleType, type PayloadArticle } from "@/lib/payload-client";

/** Shared by scripts/build-report.ts (manual runs) and the daily scheduler. */
export async function buildAndSaveReport(type: ArticleType, date: Date): Promise<PayloadArticle> {
  const built = type === "domain-sales" ? await buildDomainSalesReport(date) : await buildFundingReport(date);

  let markdown = built.markdown;
  let metrics = built.metrics;

  // Best-effort: any failure here (no key, rate limit, guardrail rejection,
  // or anything unexpected) leaves the deterministic placeholder in place --
  // the draft must always save even if the AI subsystem breaks outright.
  const dateLabel = format(date, "MMMM d, yyyy");
  let aiSummary: Awaited<ReturnType<typeof generateMarketSummary>> = null;
  try {
    aiSummary = await generateMarketSummary(built, type, dateLabel);
  } catch (err) {
    console.warn("[build-report] AI summary generation threw unexpectedly:", err);
  }
  if (aiSummary) {
    markdown = markdown.replace(MARKET_SUMMARY_PLACEHOLDER, aiSummary.text);
    metrics = {
      ...metrics,
      ai: { model: aiSummary.model, promptVersion: aiSummary.promptVersion, generatedAt: new Date().toISOString() },
    };
  }

  return upsertDraftArticle({
    slug: built.slug,
    title: built.title,
    type,
    reportDate: format(date, "yyyy-MM-dd"),
    summary: built.summary,
    contentMd: markdown,
    metrics,
  });
}
