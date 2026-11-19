"use client";

import { Link2OffIcon, LinkIcon } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
  className,
  htmlFor,
  action,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
  /** Small control shown at the end of the label row. */
  action?: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex min-h-4 items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  className,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete ?? "off"}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card"
      />
    </Field>
  );
}

/** A text field that can also carry a link, revealed with "Add link". */
export function LinkableTextField({
  label,
  value,
  url,
  onChange,
  onUrlChange,
  placeholder,
  urlPlaceholder = "https://…",
}: {
  label: string;
  value: string;
  url: string;
  onChange: (value: string) => void;
  onUrlChange: (url: string) => void;
  placeholder?: string;
  urlPlaceholder?: string;
}) {
  const id = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const showLink = linkOpen || url !== "";
  return (
    <Field
      label={label}
      htmlFor={id}
      action={
        <button
          type="button"
          onClick={() => {
            if (showLink) onUrlChange("");
            setLinkOpen(!showLink);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {showLink ? <Link2OffIcon className="size-3" /> : <LinkIcon className="size-3" />}
          {showLink ? "Remove link" : "Add link"}
        </button>
      }
    >
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        className="bg-card"
      />
      {showLink && (
        <div className="relative">
          <LinkIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={`${label} link`}
            value={url}
            placeholder={urlPlaceholder}
            autoFocus={linkOpen && url === ""}
            autoComplete="off"
            inputMode="url"
            onChange={(e) => onUrlChange(e.target.value)}
            className="bg-card pl-7"
          />
        </div>
      )}
    </Field>
  );
}

const MONTH_ITEMS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, i) => ({ value: String(i + 1).padStart(2, "0"), label }));

function yearItems(selected: string) {
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 61 }, (_, i) => String(thisYear + 5 - i));
  if (selected && !years.includes(selected)) years.push(selected);
  return years.sort((a, b) => Number(b) - Number(a)).map((year) => ({ value: year, label: year }));
}

/** Month + year picker that stores "YYYY-MM" (or "" when unset). */
export function MonthField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [year = "", month = ""] = value ? value.split("-") : [];
  const years = useMemo(() => yearItems(year), [year]);

  const update = (nextYear: string, nextMonth: string) => {
    if (!nextYear) return onChange("");
    onChange(`${nextYear}-${nextMonth || "01"}`);
  };

  return (
    <Field
      label={label}
      htmlFor={id}
      action={
        value && !disabled ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-[1.25fr_1fr] gap-1.5">
        <Select
          items={MONTH_ITEMS}
          value={month || null}
          disabled={disabled}
          onValueChange={(next) => update(year || String(new Date().getFullYear()), next ?? "")}
        >
          <SelectTrigger id={id} aria-label={`${label} month`} className="w-full min-w-0 bg-card">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {MONTH_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={years} value={year || null} disabled={disabled} onValueChange={(next) => update(next ?? "", month)}>
          <SelectTrigger aria-label={`${label} year`} className="w-full min-w-0 bg-card">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {years.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Field>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 text-xs font-medium text-muted-foreground transition-all hover:text-foreground [&_svg]:size-4",
            option.value === value && "border-border bg-card text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
