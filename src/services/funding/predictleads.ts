import { fetchJson } from "@/services/shared/http";
import { toDateStr } from "@/services/shared/dates";
import { canSpend, recordSpend } from "./budget";
import { FundingEventDTO, slugifyCompany, type FundingFetcher } from "./types";

/**
 * ⚠️ UNVERIFIED — built from PredictLeads' public docs/marketing copy only.
 * Their docs site (docs.predictleads.com) truncated before showing the real
 * Financing Events endpoint path, auth header names, and response shape, and
 * their pricing page didn't confirm whether this endpoint bills 1 credit per
 * request (like their Job Openings / News Events endpoints) or per result
 * (like Similar Companies). Confirmed only: a genuine free tier exists (100
 * credits/month, $0, not a trial).
 *
 * Before trusting this in production: sign up for a free key, run one real
 * request, and correct BASE_URL / auth headers / the mapping in `mapEvent`
 * below against the actual response. Until then this fetcher fails loudly
 * (throws) rather than silently returning wrong data, so a broken assumption
 * shows up immediately instead of polluting the database.
 */

const BASE_URL = process.env.PREDICTLEADS_BASE_URL ?? "https://predictleads.com/api/v3";
const API_TOKEN = process.env.PREDICTLEADS_API_TOKEN;
const API_KEY = process.env.PREDICTLEADS_API_KEY;
const CREDITS_CAP = Number(process.env.PREDICTLEADS_CREDITS_CAP ?? 100);
const CREDITS_PER_CALL = 1; // ASSUMED — verify against a real response

interface PredictLeadsFinancingEvent {
  id: string;
  attributes: {
    company_name: string;
    amount?: number | null;
    currency?: string | null;
    round?: string | null;
    investors?: string[] | null;
    lead_investor?: string | null;
    country?: string | null;
    announced_on: string;
    url?: string | null;
    headline?: string | null;
  };
}

interface PredictLeadsResponse {
  data: PredictLeadsFinancingEvent[];
}

function mapEvent(event: PredictLeadsFinancingEvent): FundingEventDTO | null {
  const a = event.attributes;
  const parsed = FundingEventDTO.safeParse({
    company: a.company_name,
    companySlug: slugifyCompany(a.company_name),
    amount: a.amount ?? null,
    currency: a.currency ?? "USD",
    round: a.round ?? null,
    investors: a.investors ?? [],
    leadInvestor: a.lead_investor ?? null,
    country: a.country ?? null,
    announcementDate: a.announced_on,
    source: "predictleads",
    sourceUrl: a.url ?? `https://predictleads.com/financing_events/${event.id}`,
    headline: a.headline ?? null,
    raw: event,
  });
  return parsed.success ? parsed.data : null;
}

export const predictLeadsFetcher: FundingFetcher = {
  id: "predictleads",
  tier: "structured",

  async fetch(date: Date): Promise<FundingEventDTO[]> {
    if (!API_TOKEN || !API_KEY) {
      // Not configured yet — orchestrator should skip this fetcher, not fail the run.
      return [];
    }

    const allowed = await canSpend("predictleads", CREDITS_PER_CALL, CREDITS_CAP);
    if (!allowed) {
      return []; // out of free credits for this month — RSS fetchers cover the gap
    }

    const dateStr = toDateStr(date);
    const url = new URL(`${BASE_URL}/financing_events`);
    url.searchParams.set("filter[category]", "artificial-intelligence");
    url.searchParams.set("filter[announced_on]", dateStr);

    const data = await fetchJson<PredictLeadsResponse>(url.toString(), {
      headers: {
        "X-Api-Token": API_TOKEN,
        "X-Api-Key": API_KEY,
      },
    });

    if (!Array.isArray(data?.data)) {
      throw new Error(
        "PredictLeads response shape didn't match the assumed JSON:API format — " +
          "update predictleads.ts against the real response before trusting this fetcher.",
      );
    }

    await recordSpend("predictleads", CREDITS_PER_CALL, CREDITS_CAP);

    return data.data.map(mapEvent).filter((e): e is FundingEventDTO => e !== null);
  },
};
