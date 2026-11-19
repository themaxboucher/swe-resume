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

export const DOCUMENT_FONTS: Record<FontId, string> = {
  inter: inter.style.fontFamily,
  "ibm-plex-sans": plex.style.fontFamily,
  "work-sans": workSans.style.fontFamily,
  karla: karla.style.fontFamily,
  lora: lora.style.fontFamily,
  "source-serif": sourceSerif.style.fontFamily,
  "eb-garamond": garamond.style.fontFamily,
  "libre-baskerville": baskerville.style.fontFamily,
};
