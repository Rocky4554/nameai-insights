import { createRssFundingFetcher } from "./rss-source";

/**
 * Verified live 2026-07-21. Two caveats worth keeping in mind:
 *
 * 1. Google's `when:Nd` window is relative to request time, not to the `date`
 *    argument passed to `.fetch()` — this fetcher is only useful for "today"
 *    (or the last couple of days), not for backfilling arbitrary past dates.
 * 2. The feed's own copyright notice restricts use to "personal, non-commercial
 *    use... within a personal feed reader." Fine for internal discovery/dedup
 *    against the other sources; check with legal before republishing its
 *    content verbatim on a commercial site.
 */
const QUERY = encodeURIComponent('"AI startup" funding when:2d');

export const googleNewsFetcher = createRssFundingFetcher({
  id: "google-news",
  feedUrl:
    process.env.GOOGLE_NEWS_FEED_URL ??
    `https://news.google.com/rss/search?q=${QUERY}&hl=en-US&gl=US&ceid=US:en`,
  requireAiCheck: false, // query already scopes to AI
  requireFundingCheck: true,
});
