import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-5 py-6 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-500">
          Name.ai Reports — daily .ai domain sales and AI startup funding intelligence.
        </p>
        <nav className="flex gap-4 text-xs text-zinc-500">
          <Link href="/" className="hover:text-green-700">
            Reports
          </Link>
          <Link href="/funding" className="hover:text-green-700">
            Funding
          </Link>
          <Link href="/sales" className="hover:text-green-700">
            Sales
          </Link>
          <Link href="/archive" className="hover:text-green-700">
            Archive
          </Link>
        </nav>
      </div>
    </footer>
  );
}
