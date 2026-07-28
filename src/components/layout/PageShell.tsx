import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * The framed two-column layout from the design: a white rounded card holding
 * the header + feed, with a sticky sidebar column beside it on desktop.
 */
export function PageShell({
  children,
  sidebar,
  active,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  active?: "reports" | "funding" | "sales" | "archive";
}) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-5 xl:px-0">
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_24px_64px_rgba(0,0,0,0.10)]">
          <SiteHeader active={active} />
          <main className="min-w-0 px-5 pb-16 pt-6 sm:px-8">{children}</main>
          <SiteFooter />
        </div>

        {sidebar ? (
          <aside className="sticky top-5 flex flex-col gap-3">{sidebar}</aside>
        ) : null}
      </div>
    </div>
  );
}
