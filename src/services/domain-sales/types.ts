import { z } from "zod";

export const DomainSaleDTO = z.object({
  domain: z.string().min(3).toLowerCase(),
  tld: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().length(3).default("USD"),
  saleDate: z.coerce.date(),
  marketplace: z.string().nullable(),
  source: z.string(),
  sourceUrl: z.string().url().nullable(),
  raw: z.unknown().optional(),
});
export type DomainSaleDTO = z.infer<typeof DomainSaleDTO>;

export interface SalesFetcher {
  id: string;
  /** Fetches sales for a single calendar day. */
  fetch(date: Date): Promise<DomainSaleDTO[]>;
}
