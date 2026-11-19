import { defaultDesign } from "./defaults";
import type { DocumentDesign, Entry, ResumeContent, RichText } from "./schema";

const bullets = (...items: string[]): RichText => ({
  type: "doc",
  content: [
    {
      type: "bulletList",
      content: items.map((text) => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text }] }] })),
    },
  ],
});

const paragraph = (text: string): RichText => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const entry = (e: Partial<Entry> & { id: string }): Entry => ({
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
  ...e,
});

/** Fictional persona used on the marketing page. */
export const SAMPLE_RESUME: ResumeContent = {
  personal: {
    name: "Camille Fortin",
    headline: "Senior Product Engineer",
    contacts: [
      { id: "email", type: "email", value: "camille@fortin.dev", url: "", icon: "mail" },
      { id: "phone", type: "phone", value: "+1 514 555 0142", url: "", icon: "phone" },
      { id: "location", type: "location", value: "Montréal, QC", url: "", icon: "map-pin" },
      { id: "website", type: "website", value: "", url: "fortin.dev", icon: "link" },
    ],
  },
  sections: [
    {
      id: "profile",
      type: "profile",
      title: "Profile",
      visible: true,
      content: paragraph(
        "Product-minded engineer with eight years building collaborative web apps. I ship end-to-end features, from schema to pixel, and care about fast, accessible interfaces.",
      ),
    },
    {
      id: "experience",
      type: "experience",
      title: "Experience",
      visible: true,
      entries: [
        entry({
          id: "e1",
          title: "Senior Product Engineer",
          subtitle: "Northwind Labs",
          location: "Remote",
          startDate: "2022-03",
          current: true,
          description: bullets(
            "Led the rebuild of the document editor, cutting p95 input latency from 120 ms to 18 ms.",
            "Designed a real-time sync layer used by 40k weekly active teams.",
            "Mentored five engineers; introduced RFCs and design reviews.",
          ),
        }),
        entry({
          id: "e2",
          title: "Software Engineer",
          subtitle: "Atelier Commerce",
          location: "Montréal, QC",
          startDate: "2018-06",
          endDate: "2022-02",
          description: bullets(
            "Built the checkout flow that lifted conversion by 9% across 1,200 stores.",
            "Migrated the storefront to server rendering; LCP improved by 41%.",
          ),
        }),
      ],
    },
    {
      id: "education",
      type: "education",
      title: "Education",
      visible: true,
      entries: [
        entry({
          id: "ed1",
          title: "B.Eng. Software Engineering",
          subtitle: "Polytechnique Montréal",
          startDate: "2014-09",
          endDate: "2018-05",
        }),
      ],
    },
    {
      id: "skills",
      type: "skills",
      title: "Skills",
      visible: true,
      entries: [
        entry({ id: "s1", title: "Languages", level: "TypeScript, Go, SQL" }),
        entry({ id: "s2", title: "Frontend", level: "React, Next.js, CSS" }),
        entry({ id: "s3", title: "Platform", level: "Postgres, Redis, AWS" }),
      ],
    },
    {
      id: "languages",
      type: "languages",
      title: "Languages",
      visible: true,
      entries: [
        entry({ id: "l1", title: "French", level: "Native" }),
        entry({ id: "l2", title: "English", level: "Fluent" }),
      ],
    },
  ],
};

export const SAMPLE_DESIGN: DocumentDesign = defaultDesign({
  columns: 2,
  sidebarSide: "right",
  sidebarWidth: 30,
  fontSize: 9.5,
  marginX: 14,
  marginY: 13,
});
