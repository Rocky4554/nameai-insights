const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL ?? "https://cms.h.namekart.com";
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;

export type ArticleType = "domain-sales" | "funding";

/** Shape written by src/reports/domain-sales-report.ts. */
export interface DomainSalesMetrics {
  count: number;
  totalVolume: number;
  avgPrice: number;
  topSale: { domain: string; price: number } | null;
}

/** Shape written by src/reports/funding-report.ts. */
export interface FundingMetrics {
  count: number;
  totalVolume: number;
  avgAmount: number;
  topRaise: { company: string; amount: number } | null;
}

export interface PayloadArticle {
  id: number;
  slug: string;
  title: string;
  type: ArticleType;
  reportDate: string;
  summary: string | null;
  contentMd: string | null;
  metrics: Record<string, unknown> | null;
  publishedAt: string | null;
  _status: "draft" | "published";
}

interface PayloadListResponse {
  docs: PayloadArticle[];
  totalDocs: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface ArticlePage {
  docs: PayloadArticle[];
  totalDocs: number;
  hasNextPage: boolean;
}

export function domainSalesMetrics(article: PayloadArticle): DomainSalesMetrics | null {
  return article.type === "domain-sales"
    ? (article.metrics as unknown as DomainSalesMetrics | null)
    : null;
}

export function fundingMetrics(article: PayloadArticle): FundingMetrics | null {
  return article.type === "funding"
    ? (article.metrics as unknown as FundingMetrics | null)
    : null;
}

function authHeaders(): HeadersInit {
  if (!PAYLOAD_API_KEY) return {};
  return { Authorization: `users API-Key ${PAYLOAD_API_KEY}` };
}

async function fetchArticles(params: URLSearchParams): Promise<ArticlePage> {
  const res = await fetch(`${PAYLOAD_API_URL}/api/articles?${params.toString()}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Payload articles fetch failed: ${res.status}`);
  const data = (await res.json()) as PayloadListResponse;
  return { docs: data.docs, totalDocs: data.totalDocs, hasNextPage: data.hasNextPage };
}

/**
 * Public read — Payload only returns published docs unless `draft=true` is
 * passed with credentials, so drafts stay invisible to the blog.
 */
export async function getPublishedArticlePage(
  options: {
    type?: ArticleType;
    page?: number;
    pageSize?: number;
    sort?: "-publishedAt" | "publishedAt" | "-reportDate" | "reportDate";
  } = {},
): Promise<ArticlePage> {
  const { type, page = 1, pageSize = 20, sort = "-publishedAt" } = options;
  const params = new URLSearchParams({
    limit: String(pageSize),
    page: String(page),
    sort,
  });
  if (type) params.set("where[type][equals]", type);
  return fetchArticles(params);
}

export async function getPublishedArticles(
  options: { type?: ArticleType; page?: number; pageSize?: number } = {},
): Promise<PayloadArticle[]> {
  const { docs } = await getPublishedArticlePage(options);
  return docs;
}

export async function getRecentPublishedArticles(limit = 6): Promise<PayloadArticle[]> {
  return getPublishedArticles({ pageSize: limit });
}

export async function getLatestByType(type: ArticleType): Promise<PayloadArticle | null> {
  const articles = await getPublishedArticles({ type, pageSize: 1 });
  return articles[0] ?? null;
}

/** Published totals per type, for the sidebar category counts. */
export async function getArticleCounts(): Promise<{
  all: number;
  "domain-sales": number;
  funding: number;
}> {
  const [all, sales, funding] = await Promise.all([
    getPublishedArticlePage({ pageSize: 1 }),
    getPublishedArticlePage({ type: "domain-sales", pageSize: 1 }),
    getPublishedArticlePage({ type: "funding", pageSize: 1 }),
  ]);
  return {
    all: all.totalDocs,
    "domain-sales": sales.totalDocs,
    funding: funding.totalDocs,
  };
}

export async function getPublishedArticleBySlug(slug: string): Promise<PayloadArticle | null> {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    limit: "1",
  });
  const { docs } = await fetchArticles(params);
  return docs[0] ?? null;
}

export interface UpsertArticleInput {
  slug: string;
  title: string;
  type: ArticleType;
  reportDate: string; // YYYY-MM-DD
  summary?: string;
  contentMd?: string;
  metrics?: Record<string, unknown>;
}

async function findArticleBySlugAuthenticated(slug: string): Promise<PayloadArticle | null> {
  const params = new URLSearchParams({ "where[slug][equals]": slug, limit: "1", draft: "true" });
  const res = await fetch(`${PAYLOAD_API_URL}/api/articles?${params.toString()}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Payload article lookup failed: ${res.status}`);
  const data = (await res.json()) as PayloadListResponse;
  return data.docs[0] ?? null;
}

/** Creates or updates a DRAFT article, keyed on slug — safe to re-run for the same report. Requires PAYLOAD_API_KEY. */
export async function upsertDraftArticle(input: UpsertArticleInput): Promise<PayloadArticle> {
  if (!PAYLOAD_API_KEY) {
    throw new Error("PAYLOAD_API_KEY is not set — required to write articles into Payload.");
  }

  const headers = { "Content-Type": "application/json", ...authHeaders() };
  const body = JSON.stringify({
    title: input.title,
    slug: input.slug,
    type: input.type,
    reportDate: input.reportDate,
    summary: input.summary,
    contentMd: input.contentMd,
    metrics: input.metrics,
    _status: "draft",
  });

  const existing = await findArticleBySlugAuthenticated(input.slug);
  const res = existing
    ? await fetch(`${PAYLOAD_API_URL}/api/articles/${existing.id}`, { method: "PATCH", headers, body })
    : await fetch(`${PAYLOAD_API_URL}/api/articles`, { method: "POST", headers, body });

  if (!res.ok) {
    throw new Error(`Payload upsert failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.doc ?? data) as PayloadArticle;
}

/** Flips an article's status to published (stamps publishedAt via the collection's beforeChange hook). */
export async function publishArticle(id: number): Promise<PayloadArticle> {
  if (!PAYLOAD_API_KEY) {
    throw new Error("PAYLOAD_API_KEY is not set — required to publish articles in Payload.");
  }

  const res = await fetch(`${PAYLOAD_API_URL}/api/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ _status: "published" }),
  });
  if (!res.ok) {
    throw new Error(`Payload publish failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return (data.doc ?? data) as PayloadArticle;
}
