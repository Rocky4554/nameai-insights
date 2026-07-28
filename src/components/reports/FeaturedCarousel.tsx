"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal snap slider for the featured reports strip. The cards themselves
 * are server-rendered and passed in as children; this only owns the scrolling.
 */
export function FeaturedCarousel({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const syncPosition = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth;
    setActiveIndex(step > 0 ? Math.round(track.scrollLeft / step) : 0);
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  }, []);

  useEffect(() => {
    syncPosition();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", syncPosition, { passive: true });
    window.addEventListener("resize", syncPosition);
    return () => {
      track.removeEventListener("scroll", syncPosition);
      window.removeEventListener("resize", syncPosition);
    };
  }, [syncPosition]);

  const scrollByCards = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const firstCard = track.firstElementChild as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth;
    track.scrollTo({ left: step * index, behavior: "smooth" });
  }, []);

  return (
    <section className="mb-9">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-600">
            Featured Reports
          </span>
          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center bg-sage-200 px-1 text-[10px] font-semibold text-zinc-600">
            {count}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            disabled={atStart}
            aria-label="Previous reports"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-sage-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m14.5 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            disabled={atEnd}
            aria-label="Next reports"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-sage-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-scroll scroll-smooth"
      >
        {children}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to report ${i + 1}`}
              className={`h-0.5 transition-all duration-200 ${
                i === activeIndex ? "w-5 bg-green-700" : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
