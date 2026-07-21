export function StatTile({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sublabel && <div className="mt-1 text-sm text-neutral-500">{sublabel}</div>}
    </div>
  );
}
