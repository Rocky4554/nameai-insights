import { fetchJson } from "@/services/shared/http";
import { toDateStr } from "@/services/shared/dates";
import { canSpend, recordSpend } from "./budget";
import { FundingEventDTO, slugifyCompany, type FundingFetcher } from "./types";

/**
 * Verified live 2026-07-21 against a real free-tier key. Two hard limits
 * confirmed directly from the API (not assumptions):
 *
 * 1. NO date filter exists on /discover/financing_events (only company_location,
 *    financing_types_normalized, limit, page), and results are NOT date-sorted —
 *    a real call returned events from 2022-2025 on page 1. There is no reliable
 *    way to ask this endpoint for "yesterday's" events; paging through hoping
 *    to land on a target date would waste the 100 free credits/month.
 * 2. NO industry/category tag exists anywhere in the response — `categories`/
 *    `financing_type` describe the ROUND TYPE (seed, series_a, private_equity),
 *    not the company's industry. Company info via `included` is just
 *    `domain` + `company_name`. There is no way to isolate "AI companies"
 *    server-side on this endpoint.
 *
 * Because of both limits, this fetcher is NOT usable as an independent
 * discovery source for "yesterday's AI funding" the way the RSS fetchers are.
 * It's kept here parsing the *real* response shape (confirmed correct) for a
 * secondary role: enriching a company the RSS fetchers already found (accurate
 * amount_normalized, financing_type_normalized, investor names) rather than
 * discovering AI companies on its own. `.fetch(date)` still client-side
 * filters on `effective_date`/`found_at`, but expect it to usually return
 * nothing for a specific recent date given point 1 above.
 */

const BASE_URL = process.env.PREDICTLEADS_BASE_URL ?? "https://predictleads.com/api/v3";
const API_TOKEN = process.env.PREDICTLEADS_API_TOKEN;
const API_KEY = process.env.PREDICTLEADS_API_KEY;
const CREDITS_CAP = Number(process.env.PREDICTLEADS_CREDITS_CAP ?? 100);
const CREDITS_PER_CALL = 1; // confirmed: one call to /discover/financing_events = 1 credit regardless of `limit`

interface PredictLeadsCompany {
  id: string;
  type: "company";
  attributes: {
    domain: string | null;
    company_name: string | null;
    ticker: string | null;
  };
}

interface PredictLeadsFinancingEvent {
  id: string;
  type: "financing_event";
  attributes: {
    effective_date: string | null;
    found_at: string;
    categories: string[];
    financing_type: string | null;
    financing_type_normalized: string | null;
    amount: string | null; // human string e.g. "$3.5M" — use amount_normalized instead
    amount_normalized: number | null; // already USD-normalized, no parsing needed
    source_urls: string[];
  };
  relationships: {
    company: { data: { id: string; type: "company" } | null };
    investors: { data: Array<{ id: string; type: "company" }> };
  };
}

interface PredictLeadsResponse {
  data: PredictLeadsFinancingEvent[];
  included?: PredictLeadsCompany[];
}

function mapEvent(
  event: PredictLeadsFinancingEvent,
  companiesById: Map<string, PredictLeadsCompany>,
): FundingEventDTO | null {
  const a = event.attributes;
  const companyRef = event.relationships.company.data;
  const company = companyRef ? companiesById.get(companyRef.id) : undefined;
  const companyName = company?.attributes.company_name ?? company?.attributes.domain;
  if (!companyName) return null;

  const investorNames = event.relationships.investors.data
    .map((ref) => companiesById.get(ref.id)?.attributes.company_name)
    .filter((name): name is string => Boolean(name));

  const sourceUrl = a.source_urls[0];
  if (!sourceUrl) return null;

  const parsed = FundingEventDTO.safeParse({
    company: companyName,
    companySlug: slugifyCompany(companyName),
    amount: a.amount_normalized,
    currency: "USD",
    round: a.financing_type_normalized ?? a.financing_type,
    investors: investorNames,
    leadInvestor: investorNames[0] ?? null,
    country: null,
    announcementDate: a.effective_date ?? a.found_at,
    source: "predictleads",
    sourceUrl,
    headline: null, // this dataset has no headline field, only structured attributes
    raw: event,
  });
  return parsed.success ? parsed.data : null;
}

export const predictLeadsFetcher: FundingFetcher = {
  id: "predictleads",
  tier: "structured",

  async fetch(date: Date): Promise<FundingEventDTO[]> {
    if (!API_TOKEN || !API_KEY) {
      return []; // not configured — orchestrator should skip, not fail the run
    }

    const allowed = await canSpend("predictleads", CREDITS_PER_CALL, CREDITS_CAP);
    if (!allowed) {
      return []; // out of free credits for this month — RSS fetchers cover the gap
    }

    const url = new URL(`${BASE_URL}/discover/financing_events`);
    url.searchParams.set("limit", "100");

    const data = await fetchJson<PredictLeadsResponse>(url.toString(), {
      headers: { "X-Api-Key": API_KEY, "X-Api-Token": API_TOKEN },
    });

    if (!Array.isArray(data?.data)) {
      throw new Error(
        "PredictLeads response shape changed from the verified 2026-07-21 format — " +
          "update predictleads.ts before trusting this fetcher again.",
      );
    }

    await recordSpend("predictleads", CREDITS_PER_CALL, CREDITS_CAP);

    const companiesById = new Map((data.included ?? []).map((c) => [c.id, c]));
    const targetDateStr = toDateStr(date);

    return data.data
      .map((event) => mapEvent(event, companiesById))
      .filter((e): e is FundingEventDTO => e !== null)
      .filter((e) => toDateStr(e.announcementDate) === targetDateStr);
  },
};
