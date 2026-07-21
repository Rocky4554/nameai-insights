import { createRssFundingFetcher } from "./rss-source";

/** Verified live 2026-07-21: real hit "Natural raises $30M ... AI agents" (2026-07-20). */
export const techCrunchFetcher = createRssFundingFetcher({
  id: "techcrunch",
  feedUrl:
    process.env.TECHCRUNCH_FEED_URL ?? "https://techcrunch.com/category/venture/feed/",
  requireAiCheck: true, // category is funding-focused already, but not AI-specific
  requireFundingCheck: false,
});
