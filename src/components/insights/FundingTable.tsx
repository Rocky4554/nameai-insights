import type { FundingEvent } from "@/generated/prisma/client";
import { formatUsd } from "@/lib/format";

type ResolvedFundingEvent = FundingEvent & { mentionCount?: number };

export function FundingTable({ events }: { events: ResolvedFundingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-neutral-500">No funding announcements recorded for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Round</th>
            <th className="px-4 py-3">Investors</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{event.company}</td>
              <td className="px-4 py-3">{event.amountUsd !== null ? formatUsd(Number(event.amountUsd)) : "undisclosed"}</td>
              <td className="px-4 py-3 text-neutral-500">{event.round ?? "—"}</td>
              <td className="px-4 py-3 text-neutral-500">{event.investors.join(", ") || "—"}</td>
              <td className="px-4 py-3 text-neutral-500">
                {new Date(event.announcementDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
