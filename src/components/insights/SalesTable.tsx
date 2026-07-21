import type { DomainSale } from "@/generated/prisma/client";
import { formatUsd } from "@/lib/format";

export function SalesTable({ sales }: { sales: DomainSale[] }) {
  if (sales.length === 0) {
    return <p className="text-sm text-neutral-500">No sales recorded for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10">
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Marketplace</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{sale.domain}</td>
              <td className="px-4 py-3">{formatUsd(Number(sale.priceUsd))}</td>
              <td className="px-4 py-3 text-neutral-500">{sale.marketplace ?? "—"}</td>
              <td className="px-4 py-3 text-neutral-500">
                {new Date(sale.saleDate).toLocaleDateString("en-US", {
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
