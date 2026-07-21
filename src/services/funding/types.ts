import { z } from "zod";

export const FundingEventDTO = z.object({
  company: z.string().min(1),
  companySlug: z.string().min(1),
  amount: z.number().positive().nullable(),
  currency: z.string().length(3).default("USD"),
  round: z.string().nullable(),
  investors: z.array(z.string()).default([]),
  leadInvestor: z.string().nullable(),
  country: z.string().nullable(),
  announcementDate: z.coerce.date(),
  source: z.string(),
  sourceUrl: z.string().url(),
  headline: z.string().nullable(),
  raw: z.unknown().optional(),
});
export type FundingEventDTO = z.infer<typeof FundingEventDTO>;

export type FetcherTier = "structured" | "rss";

export interface FundingFetcher {
  id: string;
  /** 'structured' = fields already parsed (PredictLeads); 'rss' = needs extract.ts */
  tier: FetcherTier;
  fetch(date: Date): Promise<FundingEventDTO[]>;
}

export function slugifyCompany(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
