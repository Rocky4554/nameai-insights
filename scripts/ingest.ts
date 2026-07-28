import "dotenv/config";
import { prisma } from "@/db/client";
import { ingestDomainSales, ingestFunding } from "@/lib/ingest";

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
