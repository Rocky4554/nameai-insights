import { createRssFundingFetcher } from "./rss-source";

/**
 * Verified live 2026-07-21. Note: no trailing slash — .../feed/ 308-redirects
 * here, and Node's fetch doesn't always follow cross-path redirects cleanly,
 * so point at the resolved URL directly.
 */
export const ventureBeatFetcher = createRssFundingFetcher({
  id: "venturebeat",
  feedUrl: process.env.VENTUREBEAT_FEED_URL ?? "https://venturebeat.com/category/ai/feed",
  requireAiCheck: false, // category is AI-focused already
  requireFundingCheck: true,
});
