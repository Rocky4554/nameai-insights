import Image from "next/image";
import Link from "next/link";

const NAV = [
  { key: "reports", label: "Reports", href: "/" },
  { key: "funding", label: "Funding", href: "/funding" },
  { key: "sales", label: "Sales", href: "/sales" },
  { key: "archive", label: "Archive", href: "/archive" },
] as const;

export function SiteHeader({
  active,
}: {
  active?: "reports" | "funding" | "sales" | "archive";
}) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="flex items-center gap-3 px-4 py-3 sm:h-15 sm:gap-8 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center" aria-label="name.ai home">
          {/* Same asset the main name.ai app serves at /nameai.png. */}
          <Image
            src="/nameai.png"
            alt="name.ai"
            width={814}
            height={161}
            priority
            className="h-4.5 w-auto sm:h-5"
          />
        </Link>

        <nav className="flex min-w-0 flex-1 overflow-x-auto no-scrollbar">
          {NAV.map((item) => {
            const isActive = active === item.key;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-2.5 py-2 text-[13px] transition-colors sm:px-4 sm:text-sm ${
                  isActive
                    ? "border-green-700 font-semibold text-green-700"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/archive"
            aria-label="Search reports"
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 sm:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>
          <a
            href="#subscribe"
            className="hidden rounded-md bg-green-700 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-green-800 sm:block"
          >
            Subscribe
          </a>
        </div>
      </div>
    </header>
  );
}
