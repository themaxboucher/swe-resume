// Monochrome line-art spot illustrations in the pdf.net spirit: ink strokes, one accent color.

const ink = { fill: "none", stroke: "#1f1f1f", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function ResumeIllustration({ className = "h-28 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <ellipse cx="80" cy="110" rx="52" ry="5" fill="#1f1f1f" opacity="0.08" />
      <g transform="rotate(-6 80 60)">
        <path d="M48 12h50l14 14v78H48z" {...ink} fill="#fff" />
        <path d="M98 12v14h14" {...ink} />
        <circle cx="62" cy="32" r="7" fill="#0084d1" stroke="#1f1f1f" strokeWidth="2.2" />
        <path d="M74 29h22M74 36h14" {...ink} />
        <path d="M58 52h42M58 60h46M58 68h38M58 80h44M58 88h30" {...ink} strokeWidth="2" opacity="0.85" />
      </g>
      <g transform="rotate(38 120 70)">
        <path d="M112 34h12v52l-6 10-6-10z" {...ink} fill="#fff" />
        <path d="M112 44h12" {...ink} />
        <path d="M112 86h12" {...ink} />
      </g>
      <path d="M24 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#0084d1" stroke="#1f1f1f" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M136 18l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#1f1f1f" />
    </svg>
  );
}

export function CoverLetterIllustration({ className = "h-28 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden>
      <ellipse cx="80" cy="110" rx="56" ry="5" fill="#1f1f1f" opacity="0.08" />
      <path d="M50 20h60v54H50z" {...ink} fill="#fff" />
      <path d="M60 32h40M60 40h34M60 48h40M60 56h24" {...ink} strokeWidth="2" opacity="0.85" />
      <path d="M30 56l50 30 50-30v46H30z" {...ink} fill="#fff" />
      <path d="M30 102l38-26M130 102l-38-26" {...ink} />
      <rect x="108" y="64" width="16" height="18" rx="1.5" fill="#0084d1" stroke="#1f1f1f" strokeWidth="2" />
      <path d="M112 70h8M112 75h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 26c6-4 10 4 16 0M128 18c5-3 8 3 13 0" {...ink} strokeWidth="1.8" />
    </svg>
  );
}
