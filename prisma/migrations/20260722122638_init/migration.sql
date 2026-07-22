-- CreateTable
CREATE TABLE "domain_sales" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tld" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priceUsd" DECIMAL(14,2) NOT NULL,
    "saleDate" DATE NOT NULL,
    "reportDate" DATE NOT NULL,
    "marketplace" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_events" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "companySlug" TEXT NOT NULL,
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountUsd" DECIMAL(16,2),
    "round" TEXT,
    "investors" TEXT[],
    "leadInvestor" TEXT,
    "country" TEXT,
    "announcementDate" DATE NOT NULL,
    "reportDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "headline" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "itemsSaved" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "creditsCap" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "domain_sales_reportDate_priceUsd_idx" ON "domain_sales"("reportDate", "priceUsd" DESC);

-- CreateIndex
CREATE INDEX "domain_sales_saleDate_idx" ON "domain_sales"("saleDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "domain_sales_domain_saleDate_marketplace_key" ON "domain_sales"("domain", "saleDate", "marketplace");

-- CreateIndex
CREATE UNIQUE INDEX "funding_events_sourceUrl_key" ON "funding_events"("sourceUrl");

-- CreateIndex
CREATE INDEX "funding_events_reportDate_amountUsd_idx" ON "funding_events"("reportDate", "amountUsd" DESC);

-- CreateIndex
CREATE INDEX "funding_events_companySlug_announcementDate_idx" ON "funding_events"("companySlug", "announcementDate");

-- CreateIndex
CREATE INDEX "ingest_runs_source_startedAt_idx" ON "ingest_runs"("source", "startedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_provider_period_key" ON "api_usage"("provider", "period");
