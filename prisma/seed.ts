import { prisma } from "@/db/client";

/**
 * Seeds raw domain-sale/funding rows for one report date, so the report
 * builders and raw-data tables have something to work against locally.
 * Article content itself now lives in Payload — after seeding, run
 * `npx tsx scripts/build-report.ts --type=domain-sales --date=2026-07-20`
 * (and --type=funding) to create the matching draft articles there, then
 * publish them from the Payload admin. Run with: npx prisma db seed
 */
async function main() {
  const reportDate = new Date("2026-07-20");

  await prisma.domainSale.createMany({
    data: [
      {
        domain: "agent.ai",
        tld: "ai",
        price: 72000,
        currency: "USD",
        priceUsd: 72000,
        saleDate: reportDate,
        reportDate,
        marketplace: "NameBio",
        source: "seed",
      },
      {
        domain: "voice.ai",
        tld: "ai",
        price: 10900,
        currency: "USD",
        priceUsd: 10900,
        saleDate: reportDate,
        reportDate,
        marketplace: "Namecheap",
        source: "seed",
      },
      {
        domain: "health.ai",
        tld: "ai",
        price: 3000,
        currency: "USD",
        priceUsd: 3000,
        saleDate: reportDate,
        reportDate,
        marketplace: "Atom.com",
        source: "seed",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.fundingEvent.createMany({
    data: [
      {
        company: "Natural",
        companySlug: "natural",
        amount: 30000000,
        currency: "USD",
        amountUsd: 30000000,
        round: "Series A",
        investors: [],
        announcementDate: reportDate,
        reportDate,
        source: "seed",
        sourceUrl: "https://example.com/seed/natural-series-a",
        headline: "Natural raises $30M to reinvent payments for AI agents",
      },
      {
        company: "VoiceAI",
        companySlug: "voiceai",
        amount: 18000000,
        currency: "USD",
        amountUsd: 18000000,
        round: "Series A",
        investors: ["Sequoia"],
        announcementDate: reportDate,
        reportDate,
        source: "seed",
        sourceUrl: "https://example.com/seed/voiceai-series-a",
        headline: "VoiceAI raises $18M Series A led by Sequoia",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded raw domain-sale/funding rows for ${reportDate.toISOString().slice(0, 10)}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
