import { z } from "zod";

// ---------- Rich text (Tiptap JSON) ----------

export type RichTextMark = { type: string; attrs?: Record<string, unknown> };
export type RichTextNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
};
export type RichText = RichTextNode & { type: "doc" };

const richTextNode: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string().max(40),
    text: z.string().max(20_000).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
    marks: z
      .array(z.object({ type: z.string().max(40), attrs: z.record(z.string(), z.unknown()).optional() }))
      .optional(),
    content: z.array(richTextNode).optional(),
  }),
);

export const richTextSchema = z
  .object({ type: z.literal("doc"), content: z.array(richTextNode).optional() })
  .nullable();

// ---------- Shared pieces ----------

const id = z.string().min(1).max(64);
const short = z.string().max(300).default("");
const monthDate = z
  .string()
  .regex(/^(\d{4}-\d{2})?$/)
  .default("");

export const CONTACT_TYPES = ["email", "phone", "location", "website", "linkedin", "github", "custom"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

/** Icons any contact field can use. Each type has a default (see CONTACT_META). */
export const CONTACT_ICONS = [
  "link",
  "globe",
  "mail",
  "phone",
  "smartphone",
  "map-pin",
  "house",
  "at-sign",
  "linkedin",
  "linkedin-box",
  "github",
  "code",
  "briefcase",
  "graduation-cap",
  "book-open",
  "pen-tool",
  "award",
  "calendar",
  "user",
  "message-circle",
  "file-text",
  "camera",
  "star",
] as const;
export type ContactIcon = (typeof CONTACT_ICONS)[number];

export const contactFieldSchema = z.object({
  id,
  type: z.enum(CONTACT_TYPES),
  /** Text shown on the document. Linkable fields fall back to the URL when this is empty. */
  value: short,
  /** Link target, for the types that support one. */
  url: short,
  /** For email and phone: whether to link as mailto:/tel:. Unset means linked. */
  linked: z.boolean().optional().catch(undefined),
  /** Chosen icon; unset means the type's default. */
  icon: z.enum(CONTACT_ICONS).optional().catch(undefined),
});
export type ContactField = z.infer<typeof contactFieldSchema>;

/** Documents saved before contacts were a list stored email/phone/location/website as flat strings. */
function migrateLegacyPersonal(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const legacy = input as Record<string, unknown>;
  if (Array.isArray(legacy.contacts)) return input;
  const text = (key: string) => (typeof legacy[key] === "string" ? (legacy[key] as string) : "");
  const contacts = [
    { id: "email", type: "email", value: text("email"), url: "", icon: "mail" },
    { id: "phone", type: "phone", value: text("phone"), url: "", icon: "phone" },
    { id: "location", type: "location", value: text("location"), url: "", icon: "map-pin" },
    { id: "website", type: "website", value: "", url: text("website"), icon: "link" },
  ];
  return { name: legacy.name, contacts };
}

export const personalDetailsSchema = z.preprocess(
  migrateLegacyPersonal,
  z.object({
    name: short,
    contacts: z.array(contactFieldSchema).max(30).default([]),
  }),
);
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;

// ---------- Resume ----------

export const LIST_SECTION_TYPES = [
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "certifications",
  "links",
  "custom",
] as const;
export type ListSectionType = (typeof LIST_SECTION_TYPES)[number];
export type SectionType = "profile" | ListSectionType;

export const entrySchema = z.object({
  id,
  title: short,
  subtitle: short,
  /** Optional link for the subtitle (employer, school, issuer…). */
  subtitleUrl: short,
  location: short,
  url: short,
  level: short,
  startDate: monthDate,
  endDate: monthDate,
  current: z.boolean().default(false),
  /** Shown instead of an end date while `current`; empty means "Present". */
  currentLabel: short,
  description: richTextSchema.default(null),
});
export type Entry = z.infer<typeof entrySchema>;

const profileSectionSchema = z.object({
  id,
  type: z.literal("profile"),
  title: short,
  content: richTextSchema.default(null),
});

const listSectionSchema = z.object({
  id,
  type: z.enum(LIST_SECTION_TYPES),
  title: short,
  entries: z.array(entrySchema).max(100).default([]),
});

export const sectionSchema = z.union([profileSectionSchema, listSectionSchema]);
export type ProfileSection = z.infer<typeof profileSectionSchema>;
export type ListSection = z.infer<typeof listSectionSchema>;
export type Section = z.infer<typeof sectionSchema>;

export const resumeContentSchema = z.object({
  personal: personalDetailsSchema,
  sections: z.array(sectionSchema).max(40),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;

// ---------- Cover letter ----------

export const coverLetterContentSchema = z.object({
  sender: personalDetailsSchema,
  recipient: z.object({
    name: short,
    title: short,
    company: short,
    address: z.string().max(600).default(""),
  }),
  date: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  subject: short,
  greeting: short,
  body: richTextSchema.default(null),
  closing: short,
  signature: short,
});
export type CoverLetterContent = z.infer<typeof coverLetterContentSchema>;

// ---------- Design ----------

export const FONT_IDS = [
  "inter",
  "ibm-plex-sans",
  "work-sans",
  "karla",
  "lora",
  "source-serif",
  "eb-garamond",
  "libre-baskerville",
] as const;
export type FontId = (typeof FONT_IDS)[number];

export const CONTACT_SEPARATORS = ["dot", "line"] as const;
export const CONTACT_ICON_STYLES = [
  "plain",
  "filled",
  "circle",
  "rounded",
  "square",
  "circle-outline",
  "rounded-outline",
  "square-outline",
] as const;
export type ContactIconStyle = (typeof CONTACT_ICON_STYLES)[number];
/** How contact details are set apart: a separator between them, or an icon before each. */
export type ContactStyle = (typeof CONTACT_SEPARATORS)[number] | ContactIconStyle;

export function isIconStyle(style: ContactStyle): style is ContactIconStyle {
  return !(CONTACT_SEPARATORS as readonly string[]).includes(style);
}

export const SUBTITLE_PLACEMENTS = ["below", "comma", "bar"] as const;
export const DEFAULT_SUBTITLE_STYLE = {
  placement: "below",
  order: "title-first",
  italic: false,
  underlineLinks: false,
} as const;

/** How an entry's second line (employer, school…) is styled and placed relative to its title. */
const subtitleStyleSchema = z
  .object({
    placement: z.enum(SUBTITLE_PLACEMENTS).catch("below"),
    /** "subtitle-first" puts the employer/school before the title. */
    order: z.enum(["title-first", "subtitle-first"]).catch("title-first"),
    italic: z.boolean().catch(false),
    underlineLinks: z.boolean().catch(false),
  })
  .catch({ ...DEFAULT_SUBTITLE_STYLE });
export type SubtitleStyle = z.infer<typeof subtitleStyleSchema>;

/** Renames settings older designs stored under different shapes. */
function migrateLegacyDesign(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const { contactIcons, subtitlePlacement, subtitleItalic, underlineSubtitleLinks, ...rest } = input as Record<
    string,
    unknown
  >;
  // A single set of subtitle settings briefly applied to every section; it now seeds both styles.
  if (rest.employerStyle === undefined && subtitlePlacement !== undefined) {
    const style = { placement: subtitlePlacement, italic: subtitleItalic, underlineLinks: underlineSubtitleLinks };
    rest.employerStyle = style;
    rest.schoolStyle = style;
  }
  if (rest.contactStyle !== undefined || contactIcons === undefined) return rest;
  const contactStyle = contactIcons === true ? "plain" : contactIcons === false || contactIcons === "none" ? "dot" : contactIcons;
  return { ...rest, contactStyle };
}

/** How linked contacts and project links read: a short label ("LinkedIn") or the spelled-out URL, for print. */
export const LINK_DISPLAYS = ["label", "url"] as const;
export type LinkDisplay = (typeof LINK_DISPLAYS)[number];

export const DATE_FORMATS = ["MM/YYYY", "MMM YYYY", "MMMM YYYY", "YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const designSchema = z.preprocess(
  migrateLegacyDesign,
  z.object({
    templateId: z.enum(["classic"]).default("classic"),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default("#0084d1"),
    /** Secondary text: contact details, dates, locations and sidebar details. */
    mutedTextColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .catch("#555555"),
    fontFamily: z.enum(FONT_IDS).default("inter"),
    fontSize: z.number().min(8).max(13).default(10),
    // Sizes below are offsets in pt from the base font size.
    nameSize: z.number().min(4).max(18).default(12),
    headingSize: z.number().min(-3).max(4).default(-2),
    /** Section heading letter spacing, in em. */
    headingLetterSpacing: z.number().min(0).max(0.3).catch(0.13),
    entryTitleSize: z.number().min(-1).max(4).default(0),
    lineHeight: z.number().min(1.1).max(1.8).default(1.4),
    marginX: z.number().min(8).max(30).default(16),
    marginY: z.number().min(8).max(30).default(14),
    sectionSpacing: z.number().min(4).max(36).default(16),
    entrySpacing: z.number().min(0).max(24).default(8),
    columns: z.union([z.literal(1), z.literal(2)]).default(1),
    sidebarSide: z.enum(["left", "right"]).default("right"),
    sidebarWidth: z.number().min(25).max(45).default(32),
    headerAlign: z.enum(["left", "center"]).default("left"),
    headerDivider: z.boolean().default(true),
    contactStyle: z.enum([...CONTACT_SEPARATORS, ...CONTACT_ICON_STYLES]).catch("dot"),
    contactIconColor: z.enum(["text", "accent"]).catch("text"),
    underlineContactLinks: z.boolean().catch(false),
    linkDisplay: z.enum(LINK_DISPLAYS).catch("label"),
    /** Employer line of experience entries (also certifications and custom sections). */
    employerStyle: subtitleStyleSchema,
    /** School line of education entries. */
    schoolStyle: subtitleStyleSchema,
    /** Underline project names that have a link. */
    underlineProjectLinks: z.boolean().catch(false),
    sectionColumns: z.record(z.string(), z.enum(["main", "sidebar"])).default({}),
    pageSize: z.enum(["A4", "LETTER"]).default("A4"),
    dateFormat: z.enum(DATE_FORMATS).default("MMM YYYY"),
  }),
);
export type DocumentDesign = z.infer<typeof designSchema>;

export const titleSchema = z.string().trim().min(1).max(120);
