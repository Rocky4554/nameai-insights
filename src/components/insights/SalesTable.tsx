import type { DomainSale } from "@/generated/prisma/client";
import { formatUsd } from "@/lib/format";

export function SalesTable({ sales }: { sales: DomainSale[] }) {
  if (sales.length === 0) {
    return <p className="text-sm text-zinc-500">No sales recorded for this report.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[10px] border border-zinc-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-sage-200/50 text-left text-[10px] uppercase tracking-[0.06em] text-zinc-600">
            <th className="px-4 py-3 font-semibold">Domain</th>
            <th className="px-4 py-3 font-semibold">Price</th>
            <th className="px-4 py-3 font-semibold">Marketplace</th>
            <th className="px-4 py-3 font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 font-medium text-zinc-800">{sale.domain}</td>
              <td className="px-4 py-3 font-medium text-green-700">
                {formatUsd(Number(sale.priceUsd))}
              </td>
              <td className="px-4 py-3 text-zinc-500">{sale.marketplace ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-400">
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
