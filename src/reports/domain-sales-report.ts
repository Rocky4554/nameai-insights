import { format } from "date-fns";
import { getSalesByReportDate, getSalesStats } from "@/db/queries/domain-sales";
import { formatUsd } from "@/lib/format";
import { slugify } from "@/lib/slug";

export interface BuiltReport {
  slug: string;
  title: string;
  summary: string;
  markdown: string;
  metrics: Record<string, unknown>;
}

/**
 * Deterministic report builder — no AI. Computes the facts block (metrics +
 * top-10 table) from the raw `domain_sales` rows for the day; the `summary`
 * field is a placeholder meant to be hand-edited before publishing. Phase 2
 * replaces only the summary/markdown generation with an LLM pass over these
 * same facts — this function's output shape is the contract that stays fixed.
 */
export async function buildDomainSalesReport(reportDate: Date): Promise<BuiltReport> {
  const dateLabel = format(reportDate, "MMMM d, yyyy");
  const [stats, sales] = await Promise.all([
    getSalesStats(reportDate),
    getSalesByReportDate(reportDate),
  ]);
  const top10 = sales.slice(0, 10);

  const title = `.AI Domain Sales Report — ${dateLabel}`;
  const slug = slugify(`ai-domain-sales-${format(reportDate, "yyyy-MM-dd")}`);

  const summary =
    stats.count === 0
      ? `No .ai domain sales recorded for ${dateLabel}.`
      : `${stats.count} .ai domain sale${stats.count === 1 ? "" : "s"} recorded for ${dateLabel}, ` +
        `totaling ${formatUsd(stats.totalVolume)}. Highest sale: ${stats.topSale?.domain} at ` +
        `${formatUsd(Number(stats.topSale?.priceUsd ?? 0))}.`;

  const tableRows = top10
    .map(
      (s, i) =>
        `| ${i + 1} | ${s.domain} | ${formatUsd(Number(s.priceUsd))} | ${s.marketplace ?? "—"} | ${format(s.saleDate, "yyyy-MM-dd")} |`,
    )
    .join("\n");

  const markdown = [
    `## Today's Highest Sale`,
    stats.topSale
      ? `**${stats.topSale.domain}** sold for **${formatUsd(Number(stats.topSale.priceUsd))}** via ${stats.topSale.marketplace ?? "an undisclosed marketplace"}.`
      : "No sales recorded for this date.",
    ``,
    `## Top ${top10.length} Sales`,
    top10.length > 0
      ? `| # | Domain | Price | Marketplace | Date |\n| --- | --- | --- | --- | --- |\n${tableRows}`
      : "_No sales to rank._",
    ``,
    `## Market Summary`,
    `_Write the summary yourself — replace this placeholder before publishing. See docs/PLAN.md § 3.8._`,
  ].join("\n");

  return {
    slug,
    title,
    summary,
    markdown,
    metrics: {
      count: stats.count,
      totalVolume: stats.totalVolume,
      avgPrice: stats.avgPrice,
      topSale: stats.topSale
        ? { domain: stats.topSale.domain, price: Number(stats.topSale.priceUsd) }
        : null,
    },
  };
}
