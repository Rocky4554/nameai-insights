import { prisma } from "@/db/client";
import type { ArticleType, Prisma } from "@/generated/prisma/client";

export interface CreateArticleInput {
  slug: string;
  title: string;
  type: ArticleType;
  reportDate: Date;
  summary?: string;
  contentMd?: string;
  metrics?: Prisma.InputJsonValue;
}

/** Upserts on (type, reportDate) — re-running the report builder for the same day replaces the draft. */
export function upsertDraftArticle(input: CreateArticleInput) {
  return prisma.article.upsert({
    where: { type_reportDate: { type: input.type, reportDate: input.reportDate } },
    create: { ...input, status: "DRAFT" },
    update: {
      title: input.title,
      summary: input.summary,
      contentMd: input.contentMd,
      metrics: input.metrics,
    },
  });
}

export function publishArticle(id: string) {
  return prisma.article.update({
    where: { id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
}

export function getArticleBySlug(slug: string) {
  return prisma.article.findUnique({ where: { slug } });
}

export function getPublishedArticles(options: { type?: ArticleType; page?: number; pageSize?: number } = {}) {
  const { type, page = 1, pageSize = 20 } = options;
  return prisma.article.findMany({
    where: { status: "PUBLISHED", ...(type ? { type } : {}) },
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

export function getRecentPublishedArticles(limit = 6) {
  return prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export function getLatestByType(type: ArticleType) {
  return prisma.article.findFirst({
    where: { status: "PUBLISHED", type },
    orderBy: { publishedAt: "desc" },
  });
}
