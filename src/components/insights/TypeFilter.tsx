import Link from "next/link";

const OPTIONS = [
  { value: undefined, label: "All" },
  { value: "domain-sales", label: "Domain Sales" },
  { value: "funding", label: "Funding" },
] as const;

export function TypeFilter({ active }: { active?: string }) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const isActive = opt.value === active;
        const href = opt.value ? `/insights?type=${opt.value}` : "/insights";
        return (
          <Link
            key={opt.label}
            href={href}
            className={`rounded-full px-3 py-1 text-sm transition ${
              isActive
                ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
            }`}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
