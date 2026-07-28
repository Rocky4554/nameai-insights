"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { subscribe, type SubscribeState } from "@/lib/actions/subscribe";

const INITIAL_STATE: SubscribeState = { status: "idle" };

export function NewsletterBand() {
  const pathname = usePathname();
  const [state, formAction, pending] = useActionState(subscribe, INITIAL_STATE);

  return (
    <section
      id="subscribe"
      className="mb-7 flex flex-col gap-5 rounded-[10px] bg-green-700 px-5 py-6 sm:px-8 sm:py-7 lg:flex-row lg:items-center lg:justify-between lg:gap-8"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage-200/60">
          Weekly Intelligence · Free
        </div>
        <h3 className="mb-1.5 font-display text-xl font-bold tracking-[-0.025em] text-white sm:text-[22px]">
          Stay ahead of AI market intelligence
        </h3>
        <p className="text-[13px] leading-[1.55] text-sage-200/70">
          Daily .ai domain sales and AI startup funding breakdowns — straight to your inbox.
        </p>
      </div>

      <form
        action={formAction}
        className="flex w-full flex-col gap-2 lg:w-auto lg:shrink-0"
      >
        <input type="hidden" name="source" value={pathname} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            placeholder="Your name"
            aria-label="Your name"
            disabled={pending}
            className="w-full min-w-0 rounded-md border border-sage-200/25 bg-sage-200/10 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-sage-200/50 focus:border-sage-200/50 disabled:opacity-60 sm:w-40"
          />
          <input
            type="email"
            name="email"
            required
            maxLength={200}
            autoComplete="email"
            placeholder="your@email.com"
            aria-label="Email address"
            disabled={pending}
            className="w-full min-w-0 rounded-md border border-sage-200/25 bg-sage-200/10 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-sage-200/50 focus:border-sage-200/50 disabled:opacity-60 sm:w-48"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-md bg-sage-200 px-6 py-2.5 text-[13px] font-semibold text-green-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Joining…" : "Join free"}
          </button>
        </div>

        {state.status !== "idle" ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-xs ${
              state.status === "success" ? "text-sage-200" : "text-red-200"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
