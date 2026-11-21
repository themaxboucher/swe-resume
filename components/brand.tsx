import Link from "next/link";
import { cn } from "@/lib/utils";

// Squircle with Apple-style continuous corners (radius 22.5, smoothing 0.6) on a 100×100 grid.
const PLATE =
  "M64 0c12.6 0 18.9 0 23.71 2.45a22.5 22.5 0 0 1 9.83 9.83c2.45 4.81 2.45 11.11 2.45 23.71L100 64c0 12.6 0 18.9-2.45 23.71a22.5 22.5 0 0 1-9.83 9.83c-4.81 2.45-11.11 2.45-23.71 2.45L36 100c-12.6 0-18.9 0-23.71-2.45a22.5 22.5 0 0 1-9.83-9.83C0 82.9 0 76.6 0 64L0 36c0-12.6 0-18.9 2.45-23.71a22.5 22.5 0 0 1 9.83-9.83C17.1 0 23.4 0 36 0Z";
// A sheet of paper whose bottom-right corner is peeled back along a gentle fold.
const PAPER =
  "M28.5 16h43a4.5 4.5 0 0 1 4.5 4.5V63c-1.4 8.6-11.4 18.6-20 20H28.5a4.5 4.5 0 0 1-4.5-4.5v-58a4.5 4.5 0 0 1 4.5-4.5Z";
// The curled-over flap: the same fold edge, then back along the folded edges through a rounded tip.
const FLAP = "M76 63c-1.4 8.6-11.4 18.6-20 20-1.4-6.6-.6-13 3.6-16.2C63.4 63.6 70 62.4 76 63Z";
const PROMPT = "M35.5 31.5 46 42 35.5 52.5M51.5 52.5H64";

/**
 * App-icon mark: a glossy blue squircle holding a sheet of paper with a peeling corner and a
 * debossed `>_` prompt. Same artwork as app/icon.svg, plus a soft drop shadow under the tile.
 * The ids are shared by every instance; the definitions are identical, so that is harmless.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={cn("size-7 overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id="swe-logo-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fd2ff" />
          <stop offset="0.5" stopColor="#2a9df4" />
          <stop offset="1" stopColor="#1d5fe4" />
        </linearGradient>
        <radialGradient id="swe-logo-dusk" cx="1" cy="1" r="0.85">
          <stop offset="0" stopColor="#5b4dff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#5b4dff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="swe-logo-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.55" stopColor="#0a3fb8" stopOpacity="0" />
          <stop offset="1" stopColor="#0a3fb8" stopOpacity="0.28" />
        </linearGradient>
        <radialGradient id="swe-logo-bloom" cx="0.3" cy="0.05" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="swe-logo-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="swe-logo-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#eaf0fa" />
        </linearGradient>
        <radialGradient id="swe-logo-tint" cx="0.15" cy="1" r="0.9">
          <stop offset="0" stopColor="#d6e2fb" />
          <stop offset="1" stopColor="#d6e2fb" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="swe-logo-flap" gradientUnits="userSpaceOnUse" x1="68" y1="75" x2="58" y2="65">
          <stop offset="0" stopColor="#a9bce8" />
          <stop offset="0.22" stopColor="#d9e2f8" />
          <stop offset="0.48" stopColor="#fff" />
          <stop offset="0.78" stopColor="#e9e7fc" />
          <stop offset="1" stopColor="#bccbef" />
        </linearGradient>
        <linearGradient id="swe-logo-ink" gradientUnits="userSpaceOnUse" x1="0" y1="28" x2="0" y2="56">
          <stop offset="0" stopColor="#34acfa" />
          <stop offset="1" stopColor="#1350d8" />
        </linearGradient>
        <clipPath id="swe-logo-clip">
          <path d={PLATE} />
        </clipPath>
        <filter id="swe-logo-drop" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0b2a66" floodOpacity="0.28" />
        </filter>
        <filter id="swe-logo-lift" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodColor="#062a72" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="0.7" stdDeviation="0.7" floodColor="#062a72" floodOpacity="0.3" />
        </filter>
        <filter id="swe-logo-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id="swe-logo-curl" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="-0.6" dy="-0.4" stdDeviation="1.4" floodColor="#0a2a6a" floodOpacity="0.3" />
        </filter>
        {/* Inner shadow along the top edge so the prompt reads as pressed into the paper. */}
        <filter id="swe-logo-inset" x="-20%" y="-20%" width="140%" height="140%">
          <feComponentTransfer in="SourceAlpha">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur stdDeviation="0.7" />
          <feOffset dy="1.1" result="offset" />
          <feFlood floodColor="#06307e" floodOpacity="0.7" />
          <feComposite in2="offset" operator="in" />
          <feComposite in2="SourceAlpha" operator="in" result="inner" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="inner" />
          </feMerge>
        </filter>
      </defs>

      <path d={PLATE} fill="url(#swe-logo-plate)" filter="url(#swe-logo-drop)" />
      <g clipPath="url(#swe-logo-clip)">
        <path d={PLATE} fill="url(#swe-logo-dusk)" />
        <path d={PLATE} fill="url(#swe-logo-floor)" />
        <path d={PLATE} fill="url(#swe-logo-bloom)" />
        <path d={PLATE} fill="none" stroke="url(#swe-logo-rim)" strokeWidth="2" />
      </g>

      <path d={FLAP} fill="#062a72" fillOpacity="0.45" transform="translate(3.2 4)" filter="url(#swe-logo-soft)" />
      <path d={PAPER} fill="url(#swe-logo-paper)" filter="url(#swe-logo-lift)" />
      <path d={PAPER} fill="url(#swe-logo-tint)" fillOpacity="0.7" />

      <path
        d={PROMPT}
        fill="none"
        stroke="#fff"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(0 0.9)"
      />
      <path
        d={PROMPT}
        fill="none"
        stroke="url(#swe-logo-ink)"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#swe-logo-inset)"
      />

      <path d={FLAP} fill="url(#swe-logo-flap)" filter="url(#swe-logo-curl)" />
      <path d={FLAP} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 text-foreground", className)}
    >
      <LogoMark />
      <span className="text-[22px] leading-none font-bold tracking-[-0.035em] whitespace-nowrap">
        SWE Resume
      </span>
    </Link>
  );
}
