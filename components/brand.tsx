import Link from "next/link";
import { cn } from "@/lib/utils";

const PAGE =
  "M7 1.5h7.4L20.5 7.6V20a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 20V4A2.5 2.5 0 0 1 7 1.5Z";

/**
 * A glossy blue page with a folded corner and a raised `>_` prompt, drawn like an app icon.
 * The ids are shared by every instance; the definitions are identical, so that is harmless.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7 overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id="swe-logo-body" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#7ad7ff" />
          <stop offset="0.55" stopColor="#21a6f3" />
          <stop offset="1" stopColor="#0c87dc" />
        </linearGradient>
        <linearGradient id="swe-logo-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.46" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="swe-logo-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#035a9e" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="swe-logo-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6f6ff" />
          <stop offset="1" stopColor="#8fd3fb" />
        </linearGradient>
        <filter id="swe-logo-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.1" stdDeviation="0.9" floodColor="#03315e" floodOpacity="0.35" />
        </filter>
        <filter id="swe-logo-emboss" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.6" stdDeviation="0.35" floodColor="#022f5c" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#swe-logo-shadow)">
        <path d={PAGE} fill="url(#swe-logo-body)" />
      </g>
      <path d={PAGE} fill="url(#swe-logo-gloss)" />
      <path d={PAGE} fill="none" stroke="url(#swe-logo-rim)" strokeWidth="0.7" />
      <path
        d="M14.4 1.5v4.5a1.6 1.6 0 0 0 1.6 1.6h4.5Z"
        fill="url(#swe-logo-fold)"
        stroke="#fff"
        strokeOpacity="0.6"
        strokeWidth="0.4"
        strokeLinejoin="round"
        filter="url(#swe-logo-emboss)"
      />
      <path
        d="M8.25 10.75 11.5 14l-3.25 3.25M13.5 17.25h3"
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#swe-logo-emboss)"
      />
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
      className={cn("flex items-center gap-1.5 text-foreground", className)}
    >
      <LogoMark />
      <span className="text-[22px] leading-none font-bold tracking-[-0.035em] whitespace-nowrap">
        SWE Resume
      </span>
    </Link>
  );
}
