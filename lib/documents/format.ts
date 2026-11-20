import type { DateFormat } from "./schema";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
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
];

/** Formats a "YYYY-MM" string. */
export function formatMonth(value: string, format: DateFormat): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month] = match;
  const monthIndex = Number(month) - 1;
  switch (format) {
    case "MM/YYYY":
      return `${month}/${year}`;
    case "MMM YYYY":
      return `${MONTHS_SHORT[monthIndex]} ${year}`;
    case "MMMM YYYY":
      return `${MONTHS_LONG[monthIndex]} ${year}`;
    case "YYYY":
      return year;
  }
}

export const DEFAULT_CURRENT_LABEL = "Present";

export function formatDateRange(
  start: string,
  end: string,
  current: boolean,
  format: DateFormat,
  currentLabel = "",
): string {
  const from = formatMonth(start, format);
  const to = current ? currentLabel.trim() || DEFAULT_CURRENT_LABEL : formatMonth(end, format);
  if (from && to) return from === to ? from : `${from} – ${to}`;
  return from || to;
}

/** Formats a "YYYY-MM-DD" string as a long, locale-neutral date (e.g. "11 November 2026"). */
export function formatLongDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${MONTHS_LONG[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export function hrefFor(url: string): string {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (url.includes("@") && !url.includes("/")) return `mailto:${url}`;
  return `https://${url}`;
}
