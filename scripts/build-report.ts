import "dotenv/config";
import { buildAndSaveReport } from "@/lib/build-report";

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

  const article = await buildAndSaveReport(type, date);

  console.log(`Draft article created in Payload: ${article.slug} (id: ${article.id})`);
  console.log(`Edit the summary in the CMS admin, then publish it there.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
