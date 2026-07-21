import Link from "next/link";
import { getPublishedArticles } from "@/db/queries/articles";
import { ArticleCard } from "@/components/insights/ArticleCard";
import { TypeFilter } from "@/components/insights/TypeFilter";
import type { ArticleType } from "@/generated/prisma/client";

export const revalidate = 3600;

const TYPE_MAP: Record<string, ArticleType> = {
  "domain-sales": "DOMAIN_SALES",
  funding: "FUNDING",
};

const PAGE_SIZE = 12;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { type: typeParam, page: pageParam } = await searchParams;
  const type = typeParam ? TYPE_MAP[typeParam] : undefined;
  const page = pageParam ? Math.max(1, Number(pageParam) || 1) : 1;

  const articles = await getPublishedArticles({ type, page, pageSize: PAGE_SIZE });
  const typeQuery = typeParam ? `type=${typeParam}&` : "";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
        <TypeFilter active={typeParam} />
      </div>

      {articles.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No reports published yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {(page > 1 || articles.length === PAGE_SIZE) && (
        <div className="mt-8 flex justify-between text-sm">
          {page > 1 ? (
            <Link href={`/insights?${typeQuery}page=${page - 1}`} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          {articles.length === PAGE_SIZE && (
            <Link href={`/insights?${typeQuery}page=${page + 1}`} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
