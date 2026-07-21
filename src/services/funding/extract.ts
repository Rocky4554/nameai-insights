/**
 * Regex-based extraction for the RSS-tier funding fetchers. Deliberately
 * best-effort (~70% accuracy expected) — Phase 1 has a human writing the
 * article summary anyway. Phase 2 replaces this file's internals with an
 * LLM extraction pass over the same stored `raw` payloads; callers don't
 * need to change.
 */

const AMOUNT_RE = /\$\s?(\d+(?:\.\d+)?)\s*(million|billion|[MB])\b/i;
const ROUND_RE = /\b(Pre-Seed|Seed|Series\s?[A-H])\b/i;
const LED_BY_RE = /\bled by\s+([A-Z][\w&.'’ -]{1,60}?)(?:[,.]|\s+with\b|\s+and\b|$)/i;
const PARTICIPATION_RE =
  /\b(?:with participation from|including|joined by)\s+([A-Z][\w&.'’ ,-]{2,150}?)(?:\.|$)/i;

const AI_RE = /\b(AI|A\.I\.|artificial intelligence|machine learning|\bML\b|LLM|generative AI)\b/i;
const FUNDING_RE =
  /\b(raises?|raised|secures?|lands?|nabs?|closes?)\b[^.]{0,40}\b(funding|round|Series\s?[A-H]|Seed|\$\d)/i;

/** Category-pinned feeds (e.g. VentureBeat's /ai/ category) already guarantee this. */
export function isAiRelated(text: string): boolean {
  return AI_RE.test(text);
}

/** Category-pinned feeds (e.g. TechCrunch's /venture/ category) already guarantee this. */
export function isFundingRelated(text: string): boolean {
  return FUNDING_RE.test(text);
}

export function looksLikeAiFunding(text: string): boolean {
  return isAiRelated(text) && isFundingRelated(text);
}

export function extractAmount(text: string): number | null {
  const match = text.match(AMOUNT_RE);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multiplier = unit.startsWith("b") ? 1_000_000_000 : 1_000_000;
  return value * multiplier;
}

export function extractRound(text: string): string | null {
  const match = text.match(ROUND_RE);
  return match ? match[1].replace(/\s+/g, " ") : null;
}

export function extractLeadInvestor(text: string): string | null {
  const match = text.match(LED_BY_RE);
  return match ? match[1].trim() : null;
}

export function extractInvestors(text: string): string[] {
  const match = text.match(PARTICIPATION_RE);
  if (!match) return [];
  return match[1]
    .split(/,|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Best-effort company name: text before the first funding verb. */
export function extractCompany(headline: string): string | null {
  const match = headline.match(/^([A-Z][\w.& '’-]{1,60}?)\s+(?:raises?|raised|secures?|lands?|nabs?)\b/i);
  return match ? match[1].trim() : null;
}
