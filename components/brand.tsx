import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 text-foreground", className)}>
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <path
          d="M7 3.5h10.5L23 9v15.5H7z"
          fill="#fff"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M17.5 3.5V9H23" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10.5 13h9M10.5 16.5h9M10.5 20h5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="7" cy="22" r="3.6" fill="#0084d1" />
      </svg>
      <span className="font-display text-[22px] leading-none">SWE Resume</span>
    </Link>
  );
}
