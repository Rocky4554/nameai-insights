import Link from "next/link";
import type { PayloadArticle } from "@/lib/payload-client";
import { highlightEntity, relativeTime } from "@/components/reports/presentation";

function Panel({
  title,
  children,
  tone = "sage",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "sage" | "green";
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-zinc-200 bg-white">
      <div
        className={`px-4 py-3 ${
          tone === "green" ? "bg-green-700" : "border-b border-zinc-200 bg-sage-200"
        }`}
      >
        <h3
          className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${
            tone === "green" ? "text-sage-200/75" : "text-zinc-600"
          }`}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export function Sidebar({
  counts,
  recent,
}: {
  counts: { all: number; "domain-sales": number; funding: number };
  recent: PayloadArticle[];
}) {
  const tags = Array.from(
    new Set(recent.map(highlightEntity).filter((v): v is string => Boolean(v))),
  ).slice(0, 8);

  return (
    <>
      <Panel title="About name.ai" tone="green">
        <div className="p-4">
          <p className="mb-4 text-[13px] leading-[1.6] text-zinc-500">
            Daily intelligence on the .ai aftermarket and AI startup funding — sales
            volumes, premium keywords, and round-by-round breakdowns for founders,
            operators, and investors.
          </p>
          <div className="mb-3.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-zinc-300 bg-sage-200 px-2 py-3.5 text-center">
              <div className="font-display text-[28px] font-bold leading-none text-green-700">
                {counts["domain-sales"]}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-zinc-500">
                Sales
              </div>
            </div>
            <div className="rounded-lg border border-zinc-300 bg-sage-200 px-2 py-3.5 text-center">
              <div className="font-display text-[28px] font-bold leading-none text-green-700">
                {counts.funding}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.06em] text-zinc-500">
                Funding
              </div>
            </div>
          </div>
          <a
            href="#subscribe"
            className="block w-full rounded-md bg-green-700 py-2.5 text-center text-[13px] font-semibold text-white transition-colors hover:bg-green-800"
          >
            Join free
          </a>
        </div>
      </Panel>

      <Panel title="Categories">
        <div>
          {[
            { label: "All Reports", href: "/", count: counts.all },
            { label: "Sales Reports", href: "/sales", count: counts["domain-sales"] },
            { label: "Funding Analysis", href: "/funding", count: counts.funding },
            { label: "Archive", href: "/archive", count: counts.all },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-100"
            >
              <span className="text-[13px] text-zinc-800">{item.label}</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {item.count}
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      {tags.length > 0 ? (
        <Panel title="Trending">
          <div className="flex flex-wrap gap-1.5 px-4 py-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600"
              >
                {tag.toLowerCase()}
              </span>
            ))}
          </div>
        </Panel>
      ) : null}

      {recent.length > 0 ? (
        <Panel title="Recent Reports">
          <div>
            {recent.slice(0, 4).map((article) => (
              <Link
                key={article.id}
                href={`/insights/${article.slug}`}
                className="block border-b border-zinc-200 px-4 py-3 transition-colors last:border-b-0 hover:bg-zinc-100"
              >
                <div className="mb-1 line-clamp-2 text-[13px] leading-[1.4] text-zinc-800">
                  {article.title}
                </div>
                <div className="text-[11px] text-zinc-400">
                  {relativeTime(article.publishedAt ?? article.reportDate)}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
