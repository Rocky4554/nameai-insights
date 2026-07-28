import { ingestDomainSales, ingestFunding } from "@/lib/ingest";
import { buildAndSaveReport } from "@/lib/build-report";

/**
 * Runs the ingest + draft-build pipeline once a day at 08:00 IST, using a
 * self-rescheduling setTimeout — no cron library, just Date math against
 * IST's fixed UTC+5:30 offset (India has no DST, so this never drifts).
 *
 * Reports land as DRAFT only; publishing stays a human decision made in the
 * Payload admin (see docs/PLAN.md § 4 — "Generated articles land as DRAFT.
 * A human still flips them to PUBLISHED.").
 */

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const TARGET_IST_HOUR = 8;
const TARGET_IST_MINUTE = 0;

let started = false;

export function startDailyReportSchedule() {
  if (started) return; // guards against double-init within one process
  started = true;
  scheduleNext();
}

function scheduleNext() {
  const now = new Date();
  const next = nextRunAt(now);
  const delayMs = next.getTime() - now.getTime();

  console.log(
    `[daily-schedule] next run at ${next.toISOString()} (${Math.round(delayMs / 60_000)} min from now)`,
  );

  setTimeout(() => {
    runDailyReports()
      .catch((err) => console.error("[daily-schedule] unexpected top-level failure:", err))
      .finally(scheduleNext);
  }, delayMs);
}

/** Next 08:00 IST strictly after `from`, computed in UTC (08:00 IST == 02:30 UTC). */
function nextRunAt(from: Date): Date {
  const targetUtcMinuteOfDay = TARGET_IST_HOUR * 60 + TARGET_IST_MINUTE - IST_OFFSET_MINUTES;
  const next = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, targetUtcMinuteOfDay, 0, 0),
  );
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

async function runDailyReports() {
  const date = new Date();
  console.log(`[daily-schedule] starting daily run for ${date.toISOString()}`);

  // Each step is independent: a funding-source outage shouldn't block the
  // domain-sales report (or vice versa), and the build steps run off
  // whatever's in the DB regardless of whether ingest fully succeeded.
  const steps: Array<[string, () => Promise<unknown>]> = [
    ["ingest domain-sales", () => ingestDomainSales(date)],
    ["ingest funding", () => ingestFunding(date)],
    ["build domain-sales report", () => buildAndSaveReport("domain-sales", date)],
    ["build funding report", () => buildAndSaveReport("funding", date)],
  ];

  for (const [label, run] of steps) {
    try {
      await run();
    } catch (err) {
      console.error(`[daily-schedule] ${label} failed:`, err);
    }
  }

  console.log("[daily-schedule] daily run complete");
}
