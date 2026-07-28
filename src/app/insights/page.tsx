import { redirect } from "next/navigation";

/**
 * The reports feed moved to `/` (with /sales, /funding and /archive for the
 * filtered views). Article permalinks still live under /insights/[slug], so
 * this index just forwards to the matching listing.
 */
export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  if (type === "domain-sales") redirect("/sales");
  if (type === "funding") redirect("/funding");
  redirect("/");
}
