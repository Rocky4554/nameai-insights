import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma/client";
import type { FundingEventDTO } from "@/services/funding";

/** Upserts on sourceUrl — every mention (even of the same raise) is its own row by design. */
export async function upsertFundingEvents(events: FundingEventDTO[], reportDate: Date): Promise<number> {
  let saved = 0;

  for (const event of events) {
    await prisma.fundingEvent.upsert({
      where: { sourceUrl: event.sourceUrl },
      create: {
        company: event.company,
        companySlug: event.companySlug,
        amount: event.amount,
        currency: event.currency,
        amountUsd: event.amount, // Phase 1: no FX conversion yet, assumes USD-denominated sources
        round: event.round,
        investors: event.investors,
        leadInvestor: event.leadInvestor,
        country: event.country,
        announcementDate: event.announcementDate,
        reportDate,
        source: event.source,
        sourceUrl: event.sourceUrl,
        headline: event.headline,
        raw: (event.raw ?? undefined) as Prisma.InputJsonValue,
      },
      update: {
        amount: event.amount,
        amountUsd: event.amount,
        round: event.round,
        investors: event.investors,
        raw: (event.raw ?? undefined) as Prisma.InputJsonValue,
      },
    });
    saved += 1;
  }

  return saved;
}

export function getFundingByReportDate(reportDate: Date) {
  return prisma.fundingEvent.findMany({
    where: { reportDate },
    orderBy: { amountUsd: "desc" },
  });
}

/**
 * Groups the day's raw rows into one canonical event per (companySlug, round),
 * preferring the PredictLeads row when multiple sources covered the same raise.
 * This is what keeps "total funding volume" from triple-counting one raise
 * covered by three outlets — see docs/PLAN.md § 3.4.
 */
export async function getResolvedFundingByReportDate(reportDate: Date) {
  const rows = await getFundingByReportDate(reportDate);
  const groups = new Map<string, (typeof rows)[number][]>();

  for (const row of rows) {
    const key = `${row.companySlug}|${row.round ?? "unknown"}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  return Array.from(groups.values()).map((group) => {
    const canonical = group.find((r) => r.source === "predictleads") ?? group[0];
    const bestAmount = group.reduce<(typeof rows)[number] | null>((best, r) => {
      if (r.amountUsd === null) return best;
      if (best === null || best.amountUsd === null) return r;
      return r;
    }, null);

    return {
      ...canonical,
      amount: canonical.amount ?? bestAmount?.amount ?? null,
      amountUsd: canonical.amountUsd ?? bestAmount?.amountUsd ?? null,
      mentionCount: group.length,
      mentions: group.map((r) => ({ source: r.source, sourceUrl: r.sourceUrl })),
    };
  });
}

export async function getFundingStats(reportDate: Date) {
  const resolved = await getResolvedFundingByReportDate(reportDate);
  const withAmount = resolved.filter((r) => r.amountUsd !== null);

  if (withAmount.length === 0) {
    return { count: resolved.length, totalVolume: 0, avgAmount: 0, topRaise: null as (typeof resolved)[number] | null };
  }

  const totalVolume = withAmount.reduce((sum, r) => sum + Number(r.amountUsd), 0);
  const topRaise = [...withAmount].sort((a, b) => Number(b.amountUsd) - Number(a.amountUsd))[0];

  return {
    count: resolved.length,
    totalVolume,
    avgAmount: totalVolume / withAmount.length,
    topRaise,
  };
}

