/**
 * Next.js calls `register()` once when a new server instance starts (stable
 * since v15) — https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation.
 * Used here to start the daily report scheduler instead of a cron library.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Guards local `next dev` from hitting real data providers on a schedule;
  // the container this actually runs in sets NODE_ENV=production.
  if (process.env.NODE_ENV !== "production") return;

  const { startDailyReportSchedule } = await import("@/lib/daily-schedule");
  startDailyReportSchedule();
}
