import {
  domainSalesMetrics,
  fundingMetrics,
  type PayloadArticle,
} from "@/lib/payload-client";
import { formatUsd } from "@/lib/format";

export const TYPE_LABEL: Record<PayloadArticle["type"], string> = {
  "domain-sales": "Sales Report",
  funding: "Funding Report",
};

export interface StatCell {
  value: string;
  label: string;
}

/** Compact USD ($1.2M / $85.9k / $940) for the tight stat cells. */
export function compactUsd(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  if (Math.abs(amount) >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return formatUsd(amount);
}

/**
 * The three-up stat grid on a report card. Values come straight from the
 * `metrics` block the report builder computed — nothing is invented here, and
 * a report with no metrics simply renders no grid.
 */
export function statCells(article: PayloadArticle): StatCell[] {
  const sales = domainSalesMetrics(article);
  if (sales) {
    return [
      { value: sales.topSale ? compactUsd(sales.topSale.price) : "—", label: "Top sale" },
      { value: String(sales.count ?? 0), label: "Sales" },
      { value: compactUsd(sales.totalVolume ?? 0), label: "Volume" },
    ];
  }

  const funding = fundingMetrics(article);
  if (funding) {
    return [
      { value: funding.topRaise ? compactUsd(funding.topRaise.amount) : "—", label: "Top raise" },
      { value: String(funding.count ?? 0), label: "Rounds" },
      { value: compactUsd(funding.totalVolume ?? 0), label: "Raised" },
    ];
  }

  return [];
}

/** Headline entity for the card's corner chip — the top domain or company. */
export function highlightEntity(article: PayloadArticle): string | null {
  const sales = domainSalesMetrics(article);
  if (sales?.topSale?.domain) return sales.topSale.domain.toUpperCase();
  const funding = fundingMetrics(article);
  if (funding?.topRaise?.company) return funding.topRaise.company.toUpperCase();
  return null;
}

/** The single number shown in a list row's left rail. */
export function leadStat(article: PayloadArticle): StatCell | null {
  const cells = statCells(article);
  return cells[0] ?? null;
}

export function formatReportDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(value: string | null): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatReportDate(value);
}
