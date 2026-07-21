import { prisma } from "@/db/client";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "2026-07"
}

/** True if spending `credits` more this month would stay within `cap`. */
export async function canSpend(provider: string, credits: number, cap: number): Promise<boolean> {
  const period = currentPeriod();
  const usage = await prisma.apiUsage.findUnique({
    where: { provider_period: { provider, period } },
  });
  return (usage?.creditsUsed ?? 0) + credits <= cap;
}

/** Records a spend after a successful call. Call this only once the request actually succeeded. */
export async function recordSpend(provider: string, credits: number, cap: number): Promise<void> {
  const period = currentPeriod();
  await prisma.apiUsage.upsert({
    where: { provider_period: { provider, period } },
    create: { provider, period, creditsUsed: credits, creditsCap: cap },
    update: { creditsUsed: { increment: credits }, creditsCap: cap },
  });
}
