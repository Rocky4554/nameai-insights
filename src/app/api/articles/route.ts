import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPublishedArticles } from "@/db/queries/articles";
import type { ArticleType } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const TYPE_MAP: Record<string, ArticleType> = {
  "domain-sales": "DOMAIN_SALES",
  funding: "FUNDING",
};

const QuerySchema = z.object({
  type: z.enum(["domain-sales", "funding"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { type, page, limit } = parsed.data;

  const articles = await getPublishedArticles({
    type: type ? TYPE_MAP[type] : undefined,
    page,
    pageSize: limit,
  });

  return NextResponse.json({ articles });
}
