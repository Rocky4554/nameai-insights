import type { Metadata } from "next";
import { ReportListingPage, parsePage } from "@/components/reports/ReportListingPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Archive",
  description: "Every Name.ai report — sales and funding, oldest to newest.",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;

  return (
    <ReportListingPage
      active="archive"
      title="Archive"
      description="Every report published so far — sales and funding together, oldest first."
      sort="publishedAt"
      basePath="/archive"
      page={parsePage(page)}
      emptyMessage="Nothing archived yet."
    />
  );
}
