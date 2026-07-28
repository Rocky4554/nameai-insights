import type { FundingEvent } from "@/generated/prisma/client";
import { formatUsd } from "@/lib/format";

type ResolvedFundingEvent = FundingEvent & { mentionCount?: number };

export function FundingTable({ events }: { events: ResolvedFundingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-zinc-500">No funding announcements recorded for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-zinc-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-sage-200/50 text-left text-[10px] uppercase tracking-[0.06em] text-zinc-600">
            <th className="px-4 py-3 font-semibold">Company</th>
            <th className="px-4 py-3 font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Round</th>
            <th className="px-4 py-3 font-semibold">Investors</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-800">{event.company}</td>
              <td className="px-4 py-3 font-medium text-green-700">
                {event.amountUsd !== null ? formatUsd(Number(event.amountUsd)) : "undisclosed"}
              </td>
              <td className="px-4 py-3 text-zinc-500">{event.round ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-500">{event.investors.join(", ") || "—"}</td>
              <td className="px-4 py-3 text-zinc-400">
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
