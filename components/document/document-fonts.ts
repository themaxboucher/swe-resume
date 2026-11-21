import {
  EB_Garamond,
  IBM_Plex_Sans,
  Inter,
  Karla,
  Libre_Baskerville,
  Lora,
  Source_Serif_4,
  Work_Sans,
} from "next/font/google";
import localFont from "next/font/local";
import type { FontId } from "@/lib/documents/schema";

// Self-hosted by next/font, so headless Chromium embeds them in the PDF.
// preload is off: the browser only downloads the family a document actually uses.
const inter = Inter({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  preload: false,
});
const workSans = Work_Sans({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const karla = Karla({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const garamond = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const baskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  preload: false,
});

// Most families above have no arrows, math or other symbols in the files Google serves, and
// serverless Chromium has no system font to borrow them from, so they printed as boxes.
// These fill in arrows and math operators (Noto Sans Math), then shapes and dingbats (Noto Sans Symbols 2).
// unicode-range keeps them to symbol blocks: they never stand in for letters and only download when used.
const notoMath = localFont({
  src: "./fonts/NotoSansMath-Regular.woff2",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+2190-23FF, U+25A0-27FF, U+2900-2BFF" }],
});
const notoSymbols = localFont({
  src: "./fonts/NotoSansSymbols2-Regular.woff2",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+2190-23FF, U+25A0-27FF, U+2900-2BFF" }],
});
const SYMBOL_FAMILIES = [notoMath.style.fontFamily, notoSymbols.style.fontFamily];

/** Slots the symbol fonts ahead of the family's local fallback, so preview and PDF draw the same glyph. */
function withSymbols(fontFamily: string) {
  const [family, ...fallbacks] = fontFamily.split(", ");
  return [family, ...SYMBOL_FAMILIES, ...fallbacks].join(", ");
}

export const DOCUMENT_FONTS: Record<FontId, string> = {
  inter: withSymbols(inter.style.fontFamily),
  "ibm-plex-sans": withSymbols(plex.style.fontFamily),
  "work-sans": withSymbols(workSans.style.fontFamily),
  karla: withSymbols(karla.style.fontFamily),
  lora: withSymbols(lora.style.fontFamily),
  "source-serif": withSymbols(sourceSerif.style.fontFamily),
  "eb-garamond": withSymbols(garamond.style.fontFamily),
  "libre-baskerville": withSymbols(baskerville.style.fontFamily),
};
