import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import {
  getArticleCounts,
  getPublishedArticlePage,
  getPublishedArticleBySlug,
} from "@/lib/payload-client";
import { getSalesByReportDate } from "@/db/queries/domain-sales";
import { getResolvedFundingByReportDate } from "@/db/queries/funding";
import { SalesTable } from "@/components/insights/SalesTable";
import { FundingTable } from "@/components/insights/FundingTable";
import { PageShell } from "@/components/layout/PageShell";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  TYPE_LABEL,
  formatReportDate,
  statCells,
} from "@/components/reports/presentation";

export const dynamic = "force-dynamic";

interface PageParams {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.summary ?? undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const reportDate = new Date(article.reportDate);
  const [rawData, counts, recent] = await Promise.all([
    article.type === "domain-sales"
      ? getSalesByReportDate(reportDate)
      : getResolvedFundingByReportDate(reportDate),
    getArticleCounts(),
    getPublishedArticlePage({ pageSize: 6 }),
  ]);

  const stats = statCells(article);

  return (
    <PageShell
      active={article.type === "funding" ? "funding" : "sales"}
      sidebar={<Sidebar counts={counts} recent={recent.docs} />}
    >
      <article className="min-w-0">
        <Link
          href={article.type === "funding" ? "/funding" : "/sales"}
          className="mb-4 inline-block text-xs text-zinc-500 transition-colors hover:text-green-700"
        >
          ← {TYPE_LABEL[article.type]}s
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sage-200 px-2.5 py-1 text-[11px] font-medium text-green-700">
            {TYPE_LABEL[article.type]}
          </span>
          <span className="text-[11px] text-zinc-400">
            {formatReportDate(article.reportDate)}
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold leading-[1.2] tracking-[-0.025em] text-zinc-900 text-pretty sm:text-3xl">
          {article.title}
        </h1>

        {article.publishedAt ? (
          <time className="mt-2 block text-sm text-zinc-400" dateTime={article.publishedAt}>
            Published {formatReportDate(article.publishedAt)}
          </time>
        ) : null}

        {article.summary ? (
          <p className="mt-4 text-lg leading-[1.6] text-zinc-600">{article.summary}</p>
        ) : null}

        {stats.length > 0 ? (
          <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-[10px] border border-zinc-200">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-sage-200/60 px-2 py-4 text-center sm:px-3 ${
                  i === 1 ? "border-x border-zinc-200" : ""
                }`}
              >
                <div className="font-display text-lg font-bold leading-none text-green-700 sm:text-2xl">
                  {stat.value}
                </div>
                <div className="mt-1.5 text-[10px] uppercase tracking-[0.07em] text-zinc-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {article.contentMd ? (
          <div className="prose prose-zinc mt-8 max-w-none prose-headings:font-display prose-headings:tracking-[-0.02em] prose-h2:text-xl prose-a:text-green-700 prose-table:text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.contentMd}</ReactMarkdown>
          </div>
        ) : null}

        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-600">
            Raw Data
          </h2>
          <div className="mt-3">
            {article.type === "domain-sales" ? (
              <SalesTable sales={rawData as Awaited<ReturnType<typeof getSalesByReportDate>>} />
            ) : (
              <FundingTable
                events={rawData as Awaited<ReturnType<typeof getResolvedFundingByReportDate>>}
              />
            )}
          </div>
        </section>
      </article>
    </PageShell>
  );
}
