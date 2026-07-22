import Link from "next/link";
import type { PayloadArticle } from "@/lib/payload-client";

const TYPE_LABEL: Record<PayloadArticle["type"], string> = {
  "domain-sales": "Domain Sales",
  funding: "Funding",
};

export function ArticleCard({ article }: { article: PayloadArticle }) {
  return (
    <Link
      href={`/insights/${article.slug}`}
      className="block rounded-lg border border-black/10 p-5 transition hover:border-black/25 dark:border-white/10 dark:hover:border-white/25"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {TYPE_LABEL[article.type]}
      </span>
      <h3 className="mt-1 text-lg font-semibold">{article.title}</h3>
      {article.summary && (
        <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {article.summary}
        </p>
      )}
      {article.publishedAt && (
        <time className="mt-3 block text-xs text-neutral-400" dateTime={article.publishedAt}>
          {new Date(article.publishedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      )}
    </Link>
  );
}
