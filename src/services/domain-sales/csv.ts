import { readFile } from "node:fs/promises";
import path from "node:path";
import { toDateStr, extractTld } from "@/services/shared/dates";
import { DomainSaleDTO, type SalesFetcher } from "./types";

/**
 * Manual fallback fetcher: reads hand-entered sales from a CSV so Phase 1
 * isn't blocked while the auctionhacker feed's July gap (see auctionhacker.ts)
 * gets resolved. Expected columns: domain,price,currency,saleDate,marketplace,sourceUrl
 */

const CSV_PATH =
  process.env.DOMAIN_SALES_CSV_PATH ?? path.join(process.cwd(), "data", "domain-sales-manual.csv");

function parseCsvLine(line: string): string[] {
  return line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

export const csvFetcher: SalesFetcher = {
  id: "manual-csv",

  async fetch(date: Date): Promise<DomainSaleDTO[]> {
    const dateStr = toDateStr(date);

    let raw: string;
    try {
      raw = await readFile(CSV_PATH, "utf-8");
    } catch {
      return []; // no manual file yet — not an error, just nothing to add
    }

    const [header, ...lines] = raw.trim().split("\n");
    const columns = parseCsvLine(header);
    const results: DomainSaleDTO[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = parseCsvLine(line);
      const row = Object.fromEntries(columns.map((col, i) => [col, cells[i]]));

      if (row.saleDate !== dateStr) continue;

      const parsed = DomainSaleDTO.safeParse({
        domain: row.domain,
        tld: extractTld(row.domain ?? ""),
        price: Number(row.price),
        currency: row.currency || "USD",
        saleDate: row.saleDate,
        marketplace: row.marketplace || null,
        source: "manual-csv",
        sourceUrl: row.sourceUrl || null,
        raw: row,
      });
      if (parsed.success) {
        results.push(parsed.data);
      }
    }

    return results;
  },
};
