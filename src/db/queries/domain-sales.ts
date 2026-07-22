import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma/client";
import type { DomainSaleDTO } from "@/services/domain-sales";

/**
 * Upserts on the (domain, saleDate, marketplace) key — safe to run the same
 * ingest twice. Uses findFirst + create/update rather than Prisma's `upsert`
 * because `marketplace` is nullable: Prisma's generated compound-unique input
 * requires a non-null value for nullable columns (and Postgres itself treats
 * distinct NULLs as non-equal in a unique index), so a real upsert can't
 * express "match on marketplace = null" — this does it explicitly instead.
 */
export async function upsertDomainSales(sales: DomainSaleDTO[], reportDate: Date): Promise<number> {
  let saved = 0;

  for (const sale of sales) {
    const existing = await prisma.domainSale.findFirst({
      where: { domain: sale.domain, saleDate: sale.saleDate, marketplace: sale.marketplace },
    });

    if (existing) {
      await prisma.domainSale.update({
        where: { id: existing.id },
        data: {
          price: sale.price,
          priceUsd: sale.price, // Phase 1: no FX conversion yet, assumes USD-denominated sources
          source: sale.source,
          raw: (sale.raw ?? undefined) as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.domainSale.create({
        data: {
          domain: sale.domain,
          tld: sale.tld,
          price: sale.price,
          currency: sale.currency,
          priceUsd: sale.price,
          saleDate: sale.saleDate,
          reportDate,
          marketplace: sale.marketplace,
          source: sale.source,
          sourceUrl: sale.sourceUrl,
          raw: (sale.raw ?? undefined) as Prisma.InputJsonValue,
        },
      });
    }
    saved += 1;
  }

  return saved;
}

export function getSalesByReportDate(reportDate: Date) {
  return prisma.domainSale.findMany({
    where: { reportDate },
    orderBy: { priceUsd: "desc" },
  });
}

export async function getSalesStats(reportDate: Date) {
  const sales = await getSalesByReportDate(reportDate);
  if (sales.length === 0) {
    return { count: 0, totalVolume: 0, avgPrice: 0, topSale: null as (typeof sales)[number] | null };
  }

  const totalVolume = sales.reduce((sum, s) => sum + Number(s.priceUsd), 0);
  return {
    count: sales.length,
    totalVolume,
    avgPrice: totalVolume / sales.length,
    topSale: sales[0], // already sorted desc
  };
}

export function getRecentSales(limit = 10) {
  return prisma.domainSale.findMany({
    orderBy: { saleDate: "desc" },
    take: limit,
  });
}
