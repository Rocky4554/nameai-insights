"use server";

import { z } from "zod";
import { prisma } from "@/db/client";
import { Prisma } from "@/generated/prisma/client";

const SubscribeSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120, "That name is too long."),
  // Lowercased before it hits the unique index so casing can't create dupes.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200, "That email is too long.")
    .pipe(z.email("Enter a valid email address.")),
  source: z.string().max(300).optional(),
});

// Type-only export: erased at compile time, so it doesn't violate the
// "use server" rule that every runtime export must be an async function.
export type SubscribeState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function subscribe(
  _prevState: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = SubscribeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    source: formData.get("source") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }

  const { name, email, source } = parsed.data;

  try {
    await prisma.subscriber.create({ data: { name, email, source: source || null } });
    return { status: "success", message: "You're on the list." };
  } catch (error) {
    // P2002 = unique constraint on `email`. Re-subscribing isn't an error worth
    // showing as one, and confirming the address is already stored would leak
    // list membership, so both paths read the same to the visitor.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { status: "success", message: "You're on the list." };
    }

    console.error("subscribe failed:", error);
    return {
      status: "error",
      message: "Something went wrong on our side. Please try again.",
    };
  }
}
