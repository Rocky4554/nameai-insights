import "dotenv/config";
import { prisma } from "@/db/client";
import { fetchAllDomainSales } from "@/services/domain-sales";
import { fetchAllFunding } from "@/services/funding";
import { upsertDomainSales } from "@/db/queries/domain-sales";
import { upsertFundingEvents } from "@/db/queries/funding";

/**
 * Usage: tsx scripts/ingest.ts --source=domain-sales|funding|all --date=YYYY-MM-DD
 * Defaults to today. Safe to run twice — every upsert key is idempotent.
 */

function parseArgs(): Record<string, string> {
  const opts: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    opts[key] = value ?? "true";
  }
  return opts;
}

async function ingestDomainSales(date: Date) {
  const run = await prisma.ingestRun.create({ data: { source: "domain-sales", status: "running" } });
  try {
    const { sales, errors } = await fetchAllDomainSales(date);
    const saved = await upsertDomainSales(sales, date);
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: errors.length > 0 ? "partial" : "success",
        itemsFound: sales.length,
        itemsSaved: saved,
        finishedAt: new Date(),
        error: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });
    console.log(
      `[domain-sales] found ${sales.length}, saved ${saved}` +
        (errors.length > 0 ? ` — errors: ${JSON.stringify(errors)}` : ""),
    );
  } catch (err) {
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}

async function ingestFunding(date: Date) {
  const run = await prisma.ingestRun.create({ data: { source: "funding", status: "running" } });
  try {
    const { events, errors } = await fetchAllFunding(date);
    const saved = await upsertFundingEvents(events, date);
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: errors.length > 0 ? "partial" : "success",
        itemsFound: events.length,
        itemsSaved: saved,
        finishedAt: new Date(),
        error: errors.length > 0 ? JSON.stringify(errors) : null,
      },
    });
    console.log(
      `[funding] found ${events.length}, saved ${saved}` +
        (errors.length > 0 ? ` — errors: ${JSON.stringify(errors)}` : ""),
    );
  } catch (err) {
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: { status: "failed", error: String(err), finishedAt: new Date() },
    });
    throw err;
  }
}

async function main() {
  const opts = parseArgs();
  const date = opts.date ? new Date(opts.date) : new Date();
  const source = opts.source ?? "all";

  if (source === "domain-sales" || source === "all") await ingestDomainSales(date);
  if (source === "funding" || source === "all") await ingestFunding(date);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
