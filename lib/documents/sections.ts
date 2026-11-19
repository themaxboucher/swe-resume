import type { Entry, ListSectionType, SectionType } from "./schema";

export type EntryField = "title" | "subtitle" | "location" | "url" | "level" | "dates" | "description";

type ListSectionConfig = {
  label: string;
  /** Fields shown in the editor form, in order. */
  fields: EntryField[];
  /** Field-specific labels and placeholders. */
  labels: Partial<Record<Exclude<EntryField, "dates" | "description">, { label: string; placeholder?: string }>>;
  /** Whether entries render compactly (one line each) in templates. */
  compact: boolean;
  addLabel: string;
  emptyTitle: string;
  /** Default column when the user switches to a two-column layout. */
  defaultColumn: "main" | "sidebar";
};

export const SECTION_CONFIG: Record<ListSectionType, ListSectionConfig> = {
  experience: {
    label: "Experience",
    fields: ["title", "subtitle", "location", "dates", "description"],
    labels: {
      title: { label: "Job title", placeholder: "Senior Software Engineer" },
      subtitle: { label: "Employer", placeholder: "Acme Inc." },
      location: { label: "Location", placeholder: "Montréal, QC" },
    },
    compact: false,
    addLabel: "Add position",
    emptyTitle: "Untitled position",
    defaultColumn: "main",
  },
  education: {
    label: "Education",
    fields: ["title", "subtitle", "location", "dates", "description"],
    labels: {
      title: { label: "Degree", placeholder: "B.Sc. Computer Science" },
      subtitle: { label: "School", placeholder: "University of Calgary" },
      location: { label: "Location", placeholder: "Calgary, AB" },
    },
    compact: false,
    addLabel: "Add education",
    emptyTitle: "Untitled education",
    defaultColumn: "main",
  },
  projects: {
    label: "Projects",
    fields: ["title", "subtitle", "url", "dates", "description"],
    labels: {
      title: { label: "Project name", placeholder: "Open-source CLI" },
      subtitle: { label: "Role or tech", placeholder: "Creator · TypeScript" },
      url: { label: "Link", placeholder: "github.com/you/project" },
    },
    compact: false,
    addLabel: "Add project",
    emptyTitle: "Untitled project",
    defaultColumn: "main",
  },
  skills: {
    label: "Skills",
    fields: ["title", "level"],
    labels: {
      title: { label: "Skill or group", placeholder: "Languages" },
      level: { label: "Details", placeholder: "TypeScript, Go, SQL" },
    },
    compact: true,
    addLabel: "Add skill",
    emptyTitle: "Untitled skill",
    defaultColumn: "sidebar",
  },
  languages: {
    label: "Languages",
    fields: ["title", "level"],
    labels: {
      title: { label: "Language", placeholder: "French" },
      level: { label: "Fluency", placeholder: "Native" },
    },
    compact: true,
    addLabel: "Add language",
    emptyTitle: "Untitled language",
    defaultColumn: "sidebar",
  },
  certifications: {
    label: "Certifications",
    fields: ["title", "subtitle", "url", "dates", "description"],
    labels: {
      title: { label: "Certificate", placeholder: "AWS Solutions Architect" },
      subtitle: { label: "Issuer", placeholder: "Amazon Web Services" },
      url: { label: "Link", placeholder: "credly.com/…" },
    },
    compact: false,
    addLabel: "Add certification",
    emptyTitle: "Untitled certification",
    defaultColumn: "main",
  },
  links: {
    label: "Links",
    fields: ["title", "url"],
    labels: {
      title: { label: "Label", placeholder: "GitHub" },
      url: { label: "URL", placeholder: "github.com/you" },
    },
    compact: true,
    addLabel: "Add link",
    emptyTitle: "Untitled link",
    defaultColumn: "sidebar",
  },
  custom: {
    label: "Custom",
    fields: ["title", "subtitle", "location", "url", "dates", "description"],
    labels: {
      title: { label: "Title", placeholder: "Volunteer mentor" },
      subtitle: { label: "Subtitle", placeholder: "Code Club" },
      location: { label: "Location" },
      url: { label: "Link" },
    },
    compact: false,
    addLabel: "Add entry",
    emptyTitle: "Untitled entry",
    defaultColumn: "main",
  },
};

export const SECTION_LABELS: Record<SectionType, string> = {
  profile: "Profile",
  ...Object.fromEntries(Object.entries(SECTION_CONFIG).map(([k, v]) => [k, v.label])),
} as Record<SectionType, string>;

export function defaultColumnFor(type: SectionType): "main" | "sidebar" {
  return type === "profile" ? "main" : SECTION_CONFIG[type].defaultColumn;
}

export function newId() {
  return crypto.randomUUID();
}

export function emptyEntry(): Entry {
  return {
    id: newId(),
    visible: true,
    title: "",
    subtitle: "",
    subtitleUrl: "",
    location: "",
    url: "",
    level: "",
    startDate: "",
    endDate: "",
    current: false,
    currentLabel: "",
    description: null,
  };
}
