const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL ?? "https://cms.h.namekart.com";
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY;

export type ArticleType = "domain-sales" | "funding";

export interface PayloadArticle {
  id: string;
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
}

function authHeaders(): HeadersInit {
  if (!PAYLOAD_API_KEY) return {};
  return { Authorization: `users API-Key ${PAYLOAD_API_KEY}` };
}

/** Public read — only ever returns published articles (Payload hides drafts unless `draft=true` is passed). */
export async function getPublishedArticles(
  options: { type?: ArticleType; page?: number; pageSize?: number } = {},
): Promise<PayloadArticle[]> {
  const { type, page = 1, pageSize = 20 } = options;
  const params = new URLSearchParams({
    limit: String(pageSize),
    page: String(page),
    sort: "-publishedAt",
  });
  if (type) params.set("where[type][equals]", type);

  const res = await fetch(`${PAYLOAD_API_URL}/api/articles?${params.toString()}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Payload articles fetch failed: ${res.status}`);
  const data = (await res.json()) as PayloadListResponse;
  return data.docs;
}

export async function getRecentPublishedArticles(limit = 6): Promise<PayloadArticle[]> {
  return getPublishedArticles({ pageSize: limit });
}

export async function getLatestByType(type: ArticleType): Promise<PayloadArticle | null> {
  const articles = await getPublishedArticles({ type, pageSize: 1 });
  return articles[0] ?? null;
}

export async function getPublishedArticleBySlug(slug: string): Promise<PayloadArticle | null> {
  const params = new URLSearchParams({
    "where[slug][equals]": slug,
    limit: "1",
  });
  const res = await fetch(`${PAYLOAD_API_URL}/api/articles?${params.toString()}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Payload article fetch failed: ${res.status}`);
  const data = (await res.json()) as PayloadListResponse;
  return data.docs[0] ?? null;
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
export async function publishArticle(id: string): Promise<PayloadArticle> {
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
