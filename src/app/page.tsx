import Link from "next/link";
import {
  getArticleCounts,
  getPublishedArticlePage,
} from "@/lib/payload-client";
import { PageShell } from "@/components/layout/PageShell";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewsletterBand } from "@/components/layout/NewsletterBand";
import { FeaturedCarousel } from "@/components/reports/FeaturedCarousel";
import { FeaturedCard } from "@/components/reports/FeaturedCard";
import { ReportList } from "@/components/reports/ReportRow";

export const dynamic = "force-dynamic";

const FEATURED_COUNT = 5;
const LATEST_COUNT = 12;

export default async function HomePage() {
  const [featuredPage, latestPage, counts] = await Promise.all([
    getPublishedArticlePage({ pageSize: FEATURED_COUNT }),
    getPublishedArticlePage({ pageSize: LATEST_COUNT }),
    getArticleCounts(),
  ]);

  const featured = featuredPage.docs;
  const latest = latestPage.docs;

  return (
    <PageShell
      active="reports"
      sidebar={<Sidebar counts={counts} recent={latest} />}
    >
      {featured.length > 0 ? (
        <FeaturedCarousel count={featured.length}>
          {featured.map((article) => (
            <FeaturedCard key={article.id} article={article} />
          ))}
        </FeaturedCarousel>
      ) : null}

      <div className="mb-7 h-px bg-zinc-200" />

      <NewsletterBand className="mb-7" />

      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-600">
          Latest Reports
        </span>
        <Link
          href="/archive"
          className="text-xs text-zinc-500 transition-colors hover:text-green-700"
        >
          View all →
        </Link>
      </div>

      <ReportList
        articles={latest}
        emptyMessage="No reports published yet. Generate one with scripts/build-report.ts, then publish it in the CMS."
      />
    </PageShell>
  );
}
