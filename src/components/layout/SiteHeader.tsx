import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Name.ai <span className="text-neutral-400 dark:text-neutral-500">Insights</span>
        </Link>
        <nav className="flex gap-6 text-sm text-neutral-600 dark:text-neutral-400">
          <Link href="/insights" className="hover:text-neutral-900 dark:hover:text-neutral-100">
            All Reports
          </Link>
          <Link
            href="/insights?type=domain-sales"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Domain Sales
          </Link>
          <Link
            href="/insights?type=funding"
            className="hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Funding
          </Link>
        </nav>
      </div>
    </header>
  );
}
