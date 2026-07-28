import { format } from "date-fns";
import { buildDomainSalesReport } from "@/reports/domain-sales-report";
import { buildFundingReport } from "@/reports/funding-report";
import { upsertDraftArticle, type ArticleType, type PayloadArticle } from "@/lib/payload-client";

/** Shared by scripts/build-report.ts (manual runs) and the daily scheduler. */
export async function buildAndSaveReport(type: ArticleType, date: Date): Promise<PayloadArticle> {
  const built = type === "domain-sales" ? await buildDomainSalesReport(date) : await buildFundingReport(date);

  return upsertDraftArticle({
    slug: built.slug,
    title: built.title,
    type,
    reportDate: format(date, "yyyy-MM-dd"),
    summary: built.summary,
    contentMd: built.markdown,
    metrics: built.metrics,
  });
}
