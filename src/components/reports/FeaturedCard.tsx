import Link from "next/link";
import type { PayloadArticle } from "@/lib/payload-client";
import { ReportArtwork } from "./ReportArtwork";
import { TYPE_LABEL, formatReportDate, highlightEntity, statCells } from "./presentation";

export function FeaturedCard({ article }: { article: PayloadArticle }) {
  const stats = statCells(article);
  const entity = highlightEntity(article);

  return (
    <Link
      href={`/insights/${article.slug}`}
      className="group relative block h-[420px] flex-[0_0_100%] snap-start overflow-hidden rounded-xl border border-zinc-300 transition-[box-shadow,transform] duration-200 hover:-translate-y-1.5 hover:shadow-[0_14px_44px_rgba(27,67,50,0.24)] sm:flex-[0_0_calc(50%-8px)]"
    >
      <div className="absolute inset-0">
        <ReportArtwork article={article} />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(14,32,22,0) 22%, rgba(14,32,22,0.82) 50%, rgba(9,22,15,0.97) 68%)",
        }}
      />
      {/* Separate top scrim: the artwork is light, so the chip row needs its
          own darkening to stay legible without muddying the middle of the card. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: "linear-gradient(to bottom, rgba(9,22,15,0.55), rgba(9,22,15,0))",
        }}
      />

      <div className="absolute left-4 top-4 z-10 flex gap-1.5">
        <span className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white">
          {TYPE_LABEL[article.type]}
        </span>
        <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/75">
          {formatReportDate(article.reportDate)}
        </span>
      </div>

      {entity ? (
        <div className="absolute right-4 top-4 z-10">
          <span className="border border-white/20 bg-black/35 px-2.5 py-1 text-[10px] font-semibold tracking-[0.05em] text-white">
            {entity}
          </span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-10 p-6">
        <h3 className="mb-2 font-display text-xl font-bold leading-[1.24] tracking-[-0.02em] text-white text-pretty">
          {article.title}
        </h3>
        {article.summary ? (
          <p className="clamp-2 mb-3 text-[13px] leading-[1.55] text-white/65">{article.summary}</p>
        ) : null}

        {stats.length > 0 ? (
          <div className="mb-3.5 grid grid-cols-3 border border-white/15 bg-white/10">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`px-2 py-2.5 text-center ${i === 1 ? "border-x border-white/15" : ""}`}
              >
                <div className="font-display text-xl font-bold leading-none text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.07em] text-white/50">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between text-xs text-white/45">
          <span>{formatReportDate(article.publishedAt ?? article.reportDate)}</span>
          <span className="font-medium text-white/70 transition-colors group-hover:text-white">
            Read report →
          </span>
        </div>
      </div>
    </Link>
  );
}
