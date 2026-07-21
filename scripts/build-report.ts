import { prisma } from "@/db/client";
import { buildDomainSalesReport } from "@/reports/domain-sales-report";
import { buildFundingReport } from "@/reports/funding-report";
import { upsertDraftArticle } from "@/db/queries/articles";
import { linkSalesToArticle } from "@/db/queries/domain-sales";
import { linkFundingToArticle } from "@/db/queries/funding";
import type { Prisma } from "@/generated/prisma/client";

/** Usage: tsx scripts/build-report.ts --type=domain-sales|funding --date=YYYY-MM-DD */

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
  const type = opts.type;

  if (type !== "domain-sales" && type !== "funding") {
    console.error("Usage: tsx scripts/build-report.ts --type=domain-sales|funding --date=YYYY-MM-DD");
    process.exitCode = 1;
    return;
  }

  const built = type === "domain-sales" ? await buildDomainSalesReport(date) : await buildFundingReport(date);

  const article = await upsertDraftArticle({
    slug: built.slug,
    title: built.title,
    type: type === "domain-sales" ? "DOMAIN_SALES" : "FUNDING",
    reportDate: date,
    summary: built.summary,
    contentMd: built.markdown,
    metrics: built.metrics as Prisma.InputJsonValue,
  });

  if (type === "domain-sales") {
    await linkSalesToArticle(date, article.id);
  } else {
    await linkFundingToArticle(date, article.id);
  }

  console.log(`Draft article created: ${article.slug} (id: ${article.id})`);
  console.log(`Edit the summary in the DB, then flip status to PUBLISHED.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
