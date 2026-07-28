export function NewsletterBand() {
  return (
    <section
      id="subscribe"
      className="mb-7 flex flex-col gap-5 rounded-[10px] bg-green-700 px-5 py-6 sm:px-8 sm:py-7 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
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
      <form className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:shrink-0">
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          aria-label="Email address"
          className="w-full min-w-0 rounded-md border border-sage-200/25 bg-sage-200/10 px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-sage-200/50 focus:border-sage-200/50 sm:w-[195px]"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-sage-200 px-6 py-2.5 text-[13px] font-semibold text-green-700 transition-colors hover:bg-white"
        >
          Join free
        </button>
      </form>
    </section>
  );
}
