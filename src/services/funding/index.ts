import type { FundingEventDTO, FundingFetcher } from "./types";
import { predictLeadsFetcher } from "./predictleads";
import { techCrunchFetcher } from "./techcrunch";
import { ventureBeatFetcher } from "./venturebeat";
import { googleNewsFetcher } from "./google-news";

// PredictLeads first (structured, credit-budgeted, may return [] if unconfigured
// or out of monthly credits); RSS fetchers always run regardless of its outcome.
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
