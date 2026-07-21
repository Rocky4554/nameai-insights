import type { DomainSaleDTO, SalesFetcher } from "./types";
import { auctionHackerFetcher } from "./auctionhacker";
import { csvFetcher } from "./csv";

const fetchers: SalesFetcher[] = [auctionHackerFetcher, csvFetcher];

export interface FetchAllResult {
  sales: DomainSaleDTO[];
  errors: Array<{ source: string; error: string }>;
}

/** Runs every registered fetcher for a day; one failing source never kills the run. */
export async function fetchAllDomainSales(date: Date): Promise<FetchAllResult> {
  const settled = await Promise.allSettled(fetchers.map((f) => f.fetch(date)));

  const sales: DomainSaleDTO[] = [];
  const errors: Array<{ source: string; error: string }> = [];
  const seen = new Set<string>();

  settled.forEach((result, i) => {
    const source = fetchers[i].id;
    if (result.status === "rejected") {
      errors.push({ source, error: String(result.reason) });
      return;
    }
    for (const sale of result.value) {
      const key = `${sale.domain}|${sale.saleDate.toISOString()}|${sale.marketplace ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sales.push(sale);
    }
  });

  return { sales, errors };
}

export { auctionHackerFetcher, csvFetcher };
export * from "./types";
