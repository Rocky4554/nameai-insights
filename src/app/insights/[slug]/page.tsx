import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { getPublishedArticleBySlug } from "@/lib/payload-client";
import { getSalesByReportDate } from "@/db/queries/domain-sales";
import { getResolvedFundingByReportDate } from "@/db/queries/funding";
import { SalesTable } from "@/components/insights/SalesTable";
import { FundingTable } from "@/components/insights/FundingTable";

export const revalidate = 3600;
export const dynamicParams = true;

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
  const rawData =
    article.type === "domain-sales"
      ? await getSalesByReportDate(reportDate)
      : await getResolvedFundingByReportDate(reportDate);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {article.type === "domain-sales" ? "Domain Sales" : "Funding"}
      </span>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{article.title}</h1>
      {article.publishedAt && (
        <time className="mt-2 block text-sm text-neutral-500" dateTime={article.publishedAt}>
          {new Date(article.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      )}

      {article.summary && (
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400">{article.summary}</p>
      )}

      {article.contentMd && (
        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-table:text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{article.contentMd}</ReactMarkdown>
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Raw Data
        </h2>
        <div className="mt-3">
          {article.type === "domain-sales" ? (
            <SalesTable sales={rawData as Awaited<ReturnType<typeof getSalesByReportDate>>} />
          ) : (
            <FundingTable events={rawData as Awaited<ReturnType<typeof getResolvedFundingByReportDate>>} />
          )}
        </div>
      </section>
    </article>
  );
}
