import { format } from "date-fns";
import { getResolvedFundingByReportDate, getFundingStats } from "@/db/queries/funding";
import { formatUsd } from "@/lib/format";
import { slugify } from "@/lib/slug";
import type { BuiltReport } from "./domain-sales-report";

/** Same contract as domain-sales-report.ts — see that file's doc comment. */
export async function buildFundingReport(reportDate: Date): Promise<BuiltReport> {
  const dateLabel = format(reportDate, "MMMM d, yyyy");
  const [stats, resolved] = await Promise.all([
    getFundingStats(reportDate),
    getResolvedFundingByReportDate(reportDate),
  ]);
  const top10 = [...resolved]
    .sort((a, b) => Number(b.amountUsd ?? 0) - Number(a.amountUsd ?? 0))
    .slice(0, 10);

  const title = `AI Startup Funding Report — ${dateLabel}`;
  const slug = slugify(`ai-funding-${format(reportDate, "yyyy-MM-dd")}`);

  const summary =
    stats.count === 0
      ? `No AI startup funding announcements recorded for ${dateLabel}.`
      : `${stats.count} AI startup funding announcement${stats.count === 1 ? "" : "s"} recorded for ${dateLabel}` +
        (stats.totalVolume > 0 ? `, totaling ${formatUsd(stats.totalVolume)} in disclosed amounts` : "") +
        (stats.topRaise ? `. Largest raise: ${stats.topRaise.company} (${stats.topRaise.round ?? "undisclosed round"}).` : ".");

  const tableRows = top10
    .map(
      (r, i) =>
        `| ${i + 1} | ${r.company} | ${r.amountUsd !== null ? formatUsd(Number(r.amountUsd)) : "undisclosed"} | ${r.round ?? "—"} | ${r.investors.join(", ") || "—"} | ${format(r.announcementDate, "yyyy-MM-dd")} |`,
    )
    .join("\n");

  const markdown = [
    `## Today's Largest Raise`,
    stats.topRaise
      ? `**${stats.topRaise.company}** raised **${formatUsd(Number(stats.topRaise.amountUsd))}** (${stats.topRaise.round ?? "undisclosed round"}).`
      : "No raises with a disclosed amount for this date.",
    ``,
    `## Top ${top10.length} Raises`,
    top10.length > 0
      ? `| # | Company | Amount | Round | Investors | Date |\n| --- | --- | --- | --- | --- | --- |\n${tableRows}`
      : "_No raises to rank._",
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
      avgAmount: stats.avgAmount,
      topRaise: stats.topRaise
        ? { company: stats.topRaise.company, amount: Number(stats.topRaise.amountUsd) }
        : null,
    },
  };
}
