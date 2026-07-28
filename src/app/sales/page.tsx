import type { Metadata } from "next";
import { ReportListingPage, parsePage } from "@/components/reports/ReportListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Reports",
  description: "Daily .ai domain sales — top sales, volume, and premium keywords.",
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;

  return (
    <ReportListingPage
      active="sales"
      title="Sales Reports"
      description=".ai domain aftermarket activity — highest sales, daily volume and premium keywords."
      type="domain-sales"
      basePath="/sales"
      page={parsePage(page)}
      emptyMessage="No sales reports published yet."
    />
  );
}
