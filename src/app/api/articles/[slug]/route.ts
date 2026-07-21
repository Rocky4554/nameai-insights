import { NextResponse } from "next/server";
import { getArticleBySlug } from "@/db/queries/articles";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article || article.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ article });
}
