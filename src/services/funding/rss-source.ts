import Parser from "rss-parser";
import { toDateStr } from "@/services/shared/dates";
import {
  extractAmount,
  extractRound,
  extractLeadInvestor,
  extractInvestors,
  extractCompany,
  isAiRelated,
  isFundingRelated,
} from "./extract";
import { FundingEventDTO, slugifyCompany, type FundingFetcher } from "./types";

const parser = new Parser();

export interface RssFetcherConfig {
  id: string;
  feedUrl: string;
  /** Skip when the feed is already scoped to AI (e.g. VentureBeat's /ai/ category). */
  requireAiCheck: boolean;
  /** Skip when the feed is already scoped to funding (e.g. TechCrunch's /venture/ category). */
  requireFundingCheck: boolean;
}

/** Shared plumbing for every RSS-tier funding fetcher — only the feed + which filters apply differ per source. */
export function createRssFundingFetcher(config: RssFetcherConfig): FundingFetcher {
  return {
    id: config.id,
    tier: "rss",

    async fetch(date: Date): Promise<FundingEventDTO[]> {
      const feed = await parser.parseURL(config.feedUrl);
      const targetDateStr = toDateStr(date);
      const results: FundingEventDTO[] = [];

      for (const item of feed.items) {
        if (!item.link || !item.pubDate) continue;
        const pubDate = new Date(item.pubDate);
        if (toDateStr(pubDate) !== targetDateStr) continue;

        const text = `${item.title ?? ""} ${item.contentSnippet ?? item.content ?? ""}`;
        if (config.requireAiCheck && !isAiRelated(text)) continue;
        if (config.requireFundingCheck && !isFundingRelated(text)) continue;

        const amount = extractAmount(text);
        const round = extractRound(text);
        if (amount === null && round === null) continue; // no funding signal at all — discard

        const company = extractCompany(item.title ?? "") ?? item.title?.split(" ")[0] ?? "Unknown";

        const parsed = FundingEventDTO.safeParse({
          company,
          companySlug: slugifyCompany(company),
          amount,
          currency: "USD",
          round,
          investors: extractInvestors(text),
          leadInvestor: extractLeadInvestor(text),
          country: null,
          announcementDate: pubDate,
          source: config.id,
          sourceUrl: item.link,
          headline: item.title ?? null,
          raw: item,
        });
        if (parsed.success) results.push(parsed.data);
      }

      return results;
    },
  };
}
