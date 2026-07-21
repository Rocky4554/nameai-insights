import { fetchJson } from "@/services/shared/http";
import { toDateStr, extractTld } from "@/services/shared/dates";
import { DomainSaleDTO, type SalesFetcher } from "./types";

/**
 * Fetches .ai domain sales from the internal NameBio-backed ingestion API
 * discovered at namebio.vps4.auctionhacker.com. Confirmed live 2026-07-21.
 *
 * Known gap (verified 2026-07-21): this API's own backfill stalled on
 * 2026-06-30 — nothing has been ingested since. Only the /namebio/sales/search
 * endpoint is reliable; /stats, /dates, /marketplaces, and the plain /sales
 * list all return 500s regardless of query params. Do not call the mutating
 * endpoints (fetch/backfill/import-csv) from here — those spend the shared
 * NameBio API credit balance and belong to whoever owns this service.
 */

interface AuctionHackerSaleRow {
  id: number;
  domain: string;
  price: number;
  saleDate: string;
  marketplace: string | null;
  createdAt: string;
  comAvailable?: "yes" | "no" | null;
  comCheckedAt?: string | null;
  aiComAvailable?: "yes" | "no" | null;
  aiComCheckedAt?: string | null;
}

interface AuctionHackerSearchResponse {
  content: AuctionHackerSaleRow[];
  totalPages: number;
  number: number;
  last: boolean;
}

const BASE_URL =
  process.env.NAMEBIO_AUCTIONHACKER_BASE_URL ?? "https://namebio.vps4.auctionhacker.com";
const PAGE_SIZE = 200;

export const auctionHackerFetcher: SalesFetcher = {
  id: "namebio-auctionhacker",

  async fetch(date: Date): Promise<DomainSaleDTO[]> {
    const dateStr = toDateStr(date);
    const results: DomainSaleDTO[] = [];
    let page = 0;

    while (true) {
      const url = new URL("/namebio/sales/search", BASE_URL);
      url.searchParams.set("dateFrom", dateStr);
      url.searchParams.set("endDate", dateStr);
      url.searchParams.set("domainSearch", ".ai");
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(PAGE_SIZE));

      const data = await fetchJson<AuctionHackerSearchResponse>(url.toString());

      for (const row of data.content) {
        const parsed = DomainSaleDTO.safeParse({
          domain: row.domain,
          tld: extractTld(row.domain),
          price: row.price,
          currency: "USD",
          saleDate: row.saleDate,
          marketplace: row.marketplace,
          source: "namebio-auctionhacker",
          sourceUrl: null,
          raw: row,
        });
        if (parsed.success) {
          results.push(parsed.data);
        }
      }

      if (data.last || page >= data.totalPages - 1) break;
      page += 1;
    }

    return results;
  },
};
