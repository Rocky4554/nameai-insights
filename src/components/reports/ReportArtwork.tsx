import {
  domainSalesMetrics,
  fundingMetrics,
  type PayloadArticle,
} from "@/lib/payload-client";
import { compactUsd } from "./presentation";

/**
 * Decorative chart art behind a featured card. Deterministic (no randomness —
 * it has to render identically on server and client) and driven by the
 * report's own metrics so the labels are real numbers.
 */
export function ReportArtwork({ article }: { article: PayloadArticle }) {
  const sales = domainSalesMetrics(article);
  const funding = fundingMetrics(article);

  if (funding) {
    const center = funding.topRaise?.company?.slice(0, 12).toUpperCase() ?? "AI ROUNDS";
    const total = compactUsd(funding.totalVolume ?? 0);
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 540 420"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <rect width="540" height="420" fill="#E8ECEA" />
        <circle cx="270" cy="175" r="68" fill="none" stroke="#C4D0C7" strokeWidth="1" />
        <circle cx="270" cy="175" r="116" fill="none" stroke="#D8E0DA" strokeWidth="0.5" />
        <line x1="270" y1="175" x2="108" y2="78" stroke="#1B4332" strokeWidth="1.5" strokeOpacity="0.55" />
        <line x1="270" y1="175" x2="432" y2="74" stroke="#1B4332" strokeWidth="1.5" strokeOpacity="0.55" />
        <line x1="270" y1="175" x2="462" y2="252" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.35" />
        <line x1="270" y1="175" x2="162" y2="280" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.35" />
        <line x1="270" y1="175" x2="76" y2="220" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.25" />
        <circle cx="270" cy="175" r="38" fill="rgba(27,67,50,0.14)" stroke="#1B4332" strokeWidth="1.5" />
        <text
          x="270"
          y="179"
          textAnchor="middle"
          fill="#1B4332"
          fontFamily="Inter, sans-serif"
          fontSize="9"
          fontWeight="700"
        >
          {center}
        </text>
        <circle cx="108" cy="78" r="20" fill="rgba(27,67,50,0.08)" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.6" />
        <circle cx="432" cy="74" r="18" fill="rgba(27,67,50,0.06)" stroke="#1B4332" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="462" cy="252" r="14" fill="rgba(27,67,50,0.04)" stroke="#A1A1AA" strokeWidth="1" />
        <circle cx="162" cy="280" r="14" fill="rgba(27,67,50,0.04)" stroke="#A1A1AA" strokeWidth="1" />
        <circle cx="76" cy="220" r="12" fill="rgba(27,67,50,0.04)" stroke="#A1A1AA" strokeWidth="1" />
        {/* Sits below the card's chip row so the two never overlap. */}
        <text
          x="270"
          y="72"
          textAnchor="middle"
          fill="#52525B"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="600"
        >
          {total} RAISED · {funding.count ?? 0} ROUNDS
        </text>
      </svg>
    );
  }

  const topLabel = sales?.topSale ? `${compactUsd(sales.topSale.price)}` : "";
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 540 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="540" height="420" fill="#E8ECEA" />
      <line x1="0" y1="84" x2="540" y2="84" stroke="#C4D0C7" strokeWidth="1" strokeDasharray="5 4" />
      <line x1="0" y1="168" x2="540" y2="168" stroke="#C4D0C7" strokeWidth="1" strokeDasharray="5 4" />
      <line x1="0" y1="252" x2="540" y2="252" stroke="#C4D0C7" strokeWidth="1" strokeDasharray="5 4" />
      <path
        d="M0,340 C90,318 150,282 220,250 C290,218 345,190 405,162 C450,140 492,118 540,94 L540,420 L0,420 Z"
        fill="rgba(27,67,50,0.11)"
      />
      <path
        d="M0,340 C90,318 150,282 220,250 C290,218 345,190 405,162 C450,140 492,118 540,94"
        fill="none"
        stroke="#1B4332"
        strokeWidth="2.5"
      />
      <circle cx="220" cy="250" r="5" fill="#1B4332" />
      <circle cx="405" cy="162" r="5" fill="#1B4332" />
      <circle cx="528" cy="96" r="6.5" fill="#1B4332" />
      {/* The 540-wide viewBox is centre-cropped to the card's width, and the
          card narrows with the viewport — so this stays near the middle to
          survive the tightest crop rather than hugging the right edge. */}
      {topLabel ? (
        <text
          x="356"
          y="150"
          fill="#1B4332"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
        >
          {topLabel}
        </text>
      ) : null}
      <text
        x="270"
        y="205"
        fill="rgba(27,67,50,0.055)"
        fontFamily="sans-serif"
        fontSize="54"
        fontWeight="700"
        textAnchor="middle"
        letterSpacing="4"
      >
        .AI SALES
      </text>
    </svg>
  );
}

/** Small square thumbnail used in the list rows. */
export function ReportThumbnail({ article }: { article: PayloadArticle }) {
  const isFunding = article.type === "funding";
  return (
    <div className="flex h-18 w-18 shrink-0 items-center justify-center self-center rounded-md border border-zinc-200 bg-sage-200">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1B4332" strokeWidth="1.6" aria-hidden="true">
        {isFunding ? (
          <>
            <circle cx="12" cy="12" r="3.2" />
            <circle cx="4.5" cy="6" r="1.8" />
            <circle cx="19.5" cy="6" r="1.8" />
            <circle cx="19" cy="18" r="1.8" />
            <path d="M9.4 10.4 6 7.2M14.6 10.4 18 7.2M14.4 13.8l3 3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M3 17.5 9 11l4 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.5 6.5H21V12" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
