import { buildDomainSalesReport } from "@/reports/domain-sales-report";
import { buildFundingReport } from "@/reports/funding-report";
import { upsertDraftArticle } from "@/lib/payload-client";
import { format } from "date-fns";

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
    type,
    reportDate: format(date, "yyyy-MM-dd"),
    summary: built.summary,
    contentMd: built.markdown,
    metrics: built.metrics,
  });

  console.log(`Draft article created in Payload: ${article.slug} (id: ${article.id})`);
  console.log(`Edit the summary in the CMS admin, then publish it there.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
