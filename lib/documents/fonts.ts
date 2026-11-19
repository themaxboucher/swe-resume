import type { FontId } from "./schema";

export const FONT_OPTIONS: { id: FontId; label: string; kind: "Sans" | "Serif" }[] = [
  { id: "inter", label: "Inter", kind: "Sans" },
  { id: "ibm-plex-sans", label: "IBM Plex Sans", kind: "Sans" },
  { id: "work-sans", label: "Work Sans", kind: "Sans" },
  { id: "karla", label: "Karla", kind: "Sans" },
  { id: "lora", label: "Lora", kind: "Serif" },
  { id: "source-serif", label: "Source Serif", kind: "Serif" },
  { id: "eb-garamond", label: "EB Garamond", kind: "Serif" },
  { id: "libre-baskerville", label: "Libre Baskerville", kind: "Serif" },
];
