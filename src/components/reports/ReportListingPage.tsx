import Link from "next/link";
import {
  getArticleCounts,
  getPublishedArticlePage,
  type ArticleType,
} from "@/lib/payload-client";
import { PageShell } from "@/components/layout/PageShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsletterBand } from "@/components/layout/NewsletterBand";
import { ReportList } from "./ReportRow";

const PAGE_SIZE = 15;

/**
 * Shared listing view behind /funding, /sales and /archive. They differ only
 * in which type they filter to, how they sort, and their copy.
 */
export async function ReportListingPage({
  active,
  title,
  description,
  type,
  sort = "-publishedAt",
  basePath,
  page,
  emptyMessage,
}: {
  active: "reports" | "funding" | "sales" | "archive";
  title: string;
  description: string;
  type?: ArticleType;
  sort?: "-publishedAt" | "publishedAt";
  basePath: string;
  page: number;
  emptyMessage?: string;
}) {
  const [listing, counts, recent] = await Promise.all([
    getPublishedArticlePage({ type, page, pageSize: PAGE_SIZE, sort }),
    getArticleCounts(),
    getPublishedArticlePage({ pageSize: 6 }),
  ]);

  return (
    <PageShell active={active} sidebar={<Sidebar counts={counts} recent={recent.docs} />}>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-[-0.025em] text-green-700">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">{description}</p>
      </header>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-600">
          {listing.totalDocs} {listing.totalDocs === 1 ? "report" : "reports"}
        </span>
      </div>

      <ReportList articles={listing.docs} emptyMessage={emptyMessage ?? "No reports published yet."} />

      {(page > 1 || listing.hasNextPage) && (
        <div className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={page === 2 ? basePath : `${basePath}?page=${page - 1}`}
              className="text-zinc-500 transition-colors hover:text-green-700"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {listing.hasNextPage ? (
            <Link
              href={`${basePath}?page=${page + 1}`}
              className="text-zinc-500 transition-colors hover:text-green-700"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}

      <NewsletterBand className="mt-9" />
    </PageShell>
  );
}

export function parsePage(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}
