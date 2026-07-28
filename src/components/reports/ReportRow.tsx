import Link from "next/link";
import type { PayloadArticle } from "@/lib/payload-client";
import { ReportThumbnail } from "./ReportArtwork";
import { TYPE_LABEL, highlightEntity, leadStat, relativeTime } from "./presentation";

export function ReportRow({ article }: { article: PayloadArticle }) {
  const stat = leadStat(article);
  const entity = highlightEntity(article);

  return (
    <Link
      href={`/insights/${article.slug}`}
      className="flex items-center gap-3.5 border-b border-zinc-200 bg-white px-5 py-4 transition-colors last:border-b-0 hover:bg-zinc-50"
    >
      {/* Left rail carries the report's headline number rather than a vote
          score — this blog has no voting, and a real metric fills the slot. */}
      <div className="flex min-w-[52px] flex-shrink-0 flex-col items-center gap-0.5">
        <span className="font-display text-[15px] font-bold leading-none text-green-700">
          {stat?.value ?? "—"}
        </span>
        {stat ? (
          <span className="text-[9px] uppercase tracking-[0.06em] text-zinc-400">{stat.label}</span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-zinc-600">{TYPE_LABEL[article.type]}</span>
          {entity ? (
            <>
              <span className="text-zinc-300">·</span>
              <span className="truncate text-[11px] text-zinc-400">{entity}</span>
            </>
          ) : null}
        </div>
        <h3 className="mb-1.5 font-display text-base font-semibold leading-[1.3] tracking-[-0.01em] text-zinc-800 text-pretty">
          {article.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{relativeTime(article.publishedAt ?? article.reportDate)}</span>
        </div>
      </div>

      <ReportThumbnail article={article} />
    </Link>
  );
}

export function ReportList({
  articles,
  emptyMessage = "No reports published yet.",
}: {
  articles: PayloadArticle[];
  emptyMessage?: string;
}) {
  if (articles.length === 0) {
    return (
      <div className="rounded-[10px] border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-zinc-200">
      {articles.map((article) => (
        <ReportRow key={article.id} article={article} />
      ))}
    </div>
  );
}
