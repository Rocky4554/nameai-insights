import type { Metadata } from "next";
import { ReportListingPage, parsePage } from "@/components/reports/ReportListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funding Reports",
  description: "Daily AI startup funding rounds, investors, and totals.",
};

export default async function FundingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;

  return (
    <ReportListingPage
      active="funding"
      title="Funding Reports"
      description="AI startup funding rounds — amounts, stages, investors and daily totals."
      type="funding"
      basePath="/funding"
      page={parsePage(page)}
      emptyMessage="No funding reports published yet."
    />
  );
}
