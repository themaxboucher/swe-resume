"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Collapsible white card used for every block of the editor form. */
export function EditorCard({
  title,
  subtitle,
  leading,
  actions,
  children,
  defaultOpen = false,
  muted = false,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  muted?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-xl bg-card shadow-card", className)}>
      <div className="flex items-center gap-1 py-1.5 pr-2 pl-1.5">
        {leading}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-sm font-semibold", muted && "text-muted-foreground line-through decoration-muted-foreground/40")}>
              {title}
            </span>
            {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
          </span>
          <ChevronDownIcon
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </button>
        {actions}
      </div>
      {open && <div className={cn("border-t border-border px-4 pt-4 pb-4", bodyClassName)}>{children}</div>}
    </div>
  );
}
