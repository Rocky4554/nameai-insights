import { prisma } from "@/db/client";

/**
 * Seeds one published article of each type with a few raw rows, so the
 * pages (/, /insights, /insights/[slug]) can be built and eyeballed before
 * any real ingestion has run. Run with: npx prisma db seed
 */
async function main() {
  const reportDate = new Date("2026-07-20");

  const salesArticle = await prisma.article.upsert({
    where: { type_reportDate: { type: "DOMAIN_SALES", reportDate } },
    create: {
      slug: "ai-domain-sales-2026-07-20",
      title: ".AI Domain Sales Report — July 20, 2026",
      type: "DOMAIN_SALES",
      reportDate,
      summary:
        "3 .ai domain sales recorded for July 20, 2026, totaling $85,900. Highest sale: agent.ai at $72,000.",
      contentMd: [
        "## Today's Highest Sale",
        "**agent.ai** sold for **$72,000** via NameBio.",
        "",
        "## Top 3 Sales",
        "| # | Domain | Price | Marketplace | Date |",
        "| --- | --- | --- | --- | --- |",
        "| 1 | agent.ai | $72,000 | NameBio | 2026-07-20 |",
        "| 2 | voice.ai | $10,900 | Namecheap | 2026-07-20 |",
        "| 3 | health.ai | $3,000 | Atom.com | 2026-07-20 |",
        "",
        "## Market Summary",
        "Seed data for local development — replace with a real report.",
      ].join("\n"),
      status: "PUBLISHED",
      publishedAt: new Date(),
      metrics: { count: 3, totalVolume: 85900, avgPrice: 28633.33, topSale: { domain: "agent.ai", price: 72000 } },
    },
    update: {},
  });

  await prisma.domainSale.createMany({
    data: [
      {
        articleId: salesArticle.id,
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
        articleId: salesArticle.id,
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
        articleId: salesArticle.id,
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

  const fundingArticle = await prisma.article.upsert({
    where: { type_reportDate: { type: "FUNDING", reportDate } },
    create: {
      slug: "ai-funding-2026-07-20",
      title: "AI Startup Funding Report — July 20, 2026",
      type: "FUNDING",
      reportDate,
      summary:
        "2 AI startup funding announcements recorded for July 20, 2026, totaling $48M. Largest raise: Natural (Series A).",
      contentMd: [
        "## Today's Largest Raise",
        "**Natural** raised **$30,000,000** (Series A).",
        "",
        "## Top 2 Raises",
        "| # | Company | Amount | Round | Investors | Date |",
        "| --- | --- | --- | --- | --- | --- |",
        "| 1 | Natural | $30,000,000 | Series A | — | 2026-07-20 |",
        "| 2 | VoiceAI | $18,000,000 | Series A | Sequoia | 2026-07-20 |",
        "",
        "## Market Summary",
        "Seed data for local development — replace with a real report.",
      ].join("\n"),
      status: "PUBLISHED",
      publishedAt: new Date(),
      metrics: { count: 2, totalVolume: 48000000, avgAmount: 24000000, topRaise: { company: "Natural", amount: 30000000 } },
    },
    update: {},
  });

  await prisma.fundingEvent.createMany({
    data: [
      {
        articleId: fundingArticle.id,
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
        articleId: fundingArticle.id,
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

  console.log("Seeded:", salesArticle.slug, fundingArticle.slug);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
