import type { FundingEventDTO, FundingFetcher } from "./types";
import { predictLeadsFetcher } from "./predictleads";
import { techCrunchFetcher } from "./techcrunch";
import { ventureBeatFetcher } from "./venturebeat";
import { googleNewsFetcher } from "./google-news";

// RSS fetchers (TechCrunch/VentureBeat/Google News) are the real discovery
// sources — see docs/PLAN.md § 3.4 for why. PredictLeads is verified against
// a live call but has no date filter and no industry tag on its financing_events
// endpoint, so it usually returns [] for a specific date; kept in the list
// (credit-budgeted) for whatever it does happen to catch, not relied on.
const fetchers: FundingFetcher[] = [
  predictLeadsFetcher,
  techCrunchFetcher,
  ventureBeatFetcher,
  googleNewsFetcher,
];

export interface FetchAllFundingResult {
  events: FundingEventDTO[];
  errors: Array<{ source: string; error: string }>;
}

/** Runs every registered fetcher for a day; one failing source never kills the run. */
export async function fetchAllFunding(date: Date): Promise<FetchAllFundingResult> {
  const settled = await Promise.allSettled(fetchers.map((f) => f.fetch(date)));

  const events: FundingEventDTO[] = [];
  const errors: Array<{ source: string; error: string }> = [];

  settled.forEach((result, i) => {
    const source = fetchers[i].id;
    if (result.status === "rejected") {
      errors.push({ source, error: String(result.reason) });
      return;
    }
    // No cross-source dedupe here on purpose — every mention is stored as its
    // own row (unique on sourceUrl) and reconciled later at report-build time.
    events.push(...result.value);
  });

  return { events, errors };
}

export { predictLeadsFetcher, techCrunchFetcher, ventureBeatFetcher, googleNewsFetcher };
export * from "./types";
