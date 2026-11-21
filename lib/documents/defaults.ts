import {
  designSchema,
  type CoverLetterContent,
  type DocumentDesign,
  type ListSectionType,
  type PersonalDetails,
  type ResumeContent,
  type Section,
} from "./schema";
import { newContact } from "./contacts";
import { SECTION_LABELS, newId } from "./sections";

export function defaultDesign(overrides: Partial<DocumentDesign> = {}): DocumentDesign {
  return designSchema.parse(overrides);
}

/** New cover letters read as a letter: a little larger type and wider margins than a resume. */
export function defaultCoverLetterDesign(): DocumentDesign {
  return defaultDesign({ fontFamily: "source-serif", fontSize: 10.5, marginX: 22, marginY: 20 });
}

type PersonalSeed = { name?: string; email?: string };

export function emptyPersonal({ name = "", email = "" }: PersonalSeed = {}): PersonalDetails {
  return {
    name,
    contacts: [
      newContact("email", email),
      newContact("phone"),
      newContact("location"),
      newContact("linkedin"),
      newContact("github"),
      newContact("website"),
    ],
  };
}

export function newSection(type: Section["type"]): Section {
  if (type === "profile") {
    return { id: newId(), type, title: SECTION_LABELS.profile, content: null };
  }
  return { id: newId(), type: type as ListSectionType, title: SECTION_LABELS[type], entries: [] };
}

export function blankResumeContent(personal: PersonalSeed = {}): ResumeContent {
  return {
    personal: emptyPersonal(personal),
    sections: (["profile", "experience", "education", "skills"] as const).map(newSection),
  };
}

export function blankCoverLetterContent(sender: PersonalSeed = {}): CoverLetterContent {
  return {
    sender: emptyPersonal(sender),
    recipient: { name: "", title: "", company: "", address: "" },
    date: new Date().toISOString().slice(0, 10),
    subject: "",
    greeting: "Dear Hiring Manager,",
    body: null,
    closing: "Sincerely,",
    signature: sender.name ?? "",
  };
}
