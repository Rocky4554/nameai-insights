import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/db/client";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  min: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { from, to, min, limit } = parsed.data;

  const sales = await prisma.domainSale.findMany({
    where: {
      ...(from || to ? { saleDate: { gte: from, lte: to } } : {}),
      ...(min !== undefined ? { priceUsd: { gte: min } } : {}),
    },
    orderBy: { priceUsd: "desc" },
    take: limit,
  });

  return NextResponse.json({ sales });
}
