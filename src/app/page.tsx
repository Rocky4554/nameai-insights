import Link from "next/link";
import { getLatestByType, getRecentPublishedArticles } from "@/lib/payload-client";
import { ArticleCard } from "@/components/insights/ArticleCard";
import { StatTile } from "@/components/insights/StatTile";
import { formatUsd } from "@/lib/format";

export const dynamic = "force-dynamic";

interface DomainSalesMetrics {
  count: number;
  totalVolume: number;
  avgPrice: number;
  topSale: { domain: string; price: number } | null;
}

interface FundingMetrics {
  count: number;
  totalVolume: number;
  avgAmount: number;
  topRaise: { company: string; amount: number } | null;
}

export default async function HomePage() {
  const [latestSales, latestFunding, recent] = await Promise.all([
    getLatestByType("domain-sales"),
    getLatestByType("funding"),
    getRecentPublishedArticles(6),
  ]);

  const salesMetrics = latestSales?.metrics as unknown as DomainSalesMetrics | undefined;
  const fundingMetrics = latestFunding?.metrics as unknown as FundingMetrics | undefined;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Daily intelligence on .AI domains and AI startup funding
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
          Every day: the biggest .ai domain sales and the latest AI startup funding rounds,
          backed by raw data you can dig into yourself.
        </p>
      </section>

      {(salesMetrics?.topSale || fundingMetrics?.topRaise) && (
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {salesMetrics?.topSale && (
            <StatTile
              label="Latest Top Sale"
              value={formatUsd(salesMetrics.topSale.price)}
              sublabel={salesMetrics.topSale.domain}
            />
          )}
          {fundingMetrics?.topRaise && (
            <StatTile
              label="Latest Top Raise"
              value={formatUsd(fundingMetrics.topRaise.amount)}
              sublabel={fundingMetrics.topRaise.company}
            />
          )}
          {salesMetrics && (
            <StatTile
              label="Sales Tracked"
              value={String(salesMetrics.count)}
              sublabel={`${formatUsd(salesMetrics.totalVolume)} total volume`}
            />
          )}
        </section>
      )}

      <section className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Latest Domain Sales Report
          </h2>
          <div className="mt-3">
            {latestSales ? (
              <ArticleCard article={latestSales} />
            ) : (
              <p className="text-sm text-neutral-500">No domain sales report published yet.</p>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Latest Funding Report
          </h2>
          <div className="mt-3">
            {latestFunding ? (
              <ArticleCard article={latestFunding} />
            ) : (
              <p className="text-sm text-neutral-500">No funding report published yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Recent Reports
          </h2>
          <Link href="/insights" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
            View all →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
