import { z } from "zod";
import {
  designSchema,
  LINK_DISPLAYS,
  type LinkDisplay,
  type ResumeContent,
  type Section,
} from "./schema";

// A version is a view over the one shared resume: which sections, entries and contacts it shows, in what
// order, and how it looks. Every list keeps hidden items too, so each item has a stable spot in every version.

const id = z.string().min(1).max(64);

const entryLayoutSchema = z.object({ id, shown: z.boolean().catch(false) });

const sectionLayoutSchema = z.object({
  id,
  shown: z.boolean().catch(false),
  entries: z.array(entryLayoutSchema).max(100).catch([]),
});

const contactLayoutSchema = z.object({
  id,
  shown: z.boolean().catch(false),
  /** Overrides the version's link display for this contact. */
  linkDisplay: z.enum(LINK_DISPLAYS).optional().catch(undefined),
});

export const versionLayoutSchema = z.object({
  sections: z.array(sectionLayoutSchema).max(40).catch([]),
  contacts: z.array(contactLayoutSchema).max(30).catch([]),
});

export type VersionLayout = z.infer<typeof versionLayoutSchema>;
export type SectionLayout = z.infer<typeof sectionLayoutSchema>;
export type ContactLayout = z.infer<typeof contactLayoutSchema>;
export type LayoutItem = { id: string; shown: boolean };

export const versionNameSchema = z.string().trim().min(1).max(60);

export const versionSchema = z.object({
  id: z.uuid(),
  name: versionNameSchema,
  position: z.number().int().min(0).max(100_000),
  design: designSchema,
  layout: versionLayoutSchema,
});
export type ResumeVersion = z.infer<typeof versionSchema>;

export const DEFAULT_VERSION_NAME = "Main";

/** Where an item lives: the section list, one section's entries, or the contact list. */
export type ItemScope = { kind: "section" } | { kind: "entry"; sectionId: string } | { kind: "contact" };

export function layoutList(layout: VersionLayout, scope: ItemScope): LayoutItem[] | undefined {
  switch (scope.kind) {
    case "section":
      return layout.sections;
    case "contact":
      return layout.contacts;
    case "entry":
      return layout.sections.find((s) => s.id === scope.sectionId)?.entries;
  }
}

export function isShown(layout: VersionLayout, scope: ItemScope, itemId: string): boolean {
  return layoutList(layout, scope)?.find((item) => item.id === itemId)?.shown ?? false;
}

/**
 * Items in the version's order, each with whether the version shows it. Items the layout doesn't know yet
 * come last, hidden, so a stale layout never breaks rendering.
 */
export function ordered<T extends { id: string }>(
  items: readonly T[],
  layoutItems: readonly LayoutItem[] | undefined,
): { item: T; shown: boolean }[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const result: { item: T; shown: boolean }[] = [];
  const seen = new Set<string>();
  for (const { id: itemId, shown } of layoutItems ?? []) {
    const item = byId.get(itemId);
    if (!item || seen.has(itemId)) continue;
    seen.add(itemId);
    result.push({ item, shown });
  }
  for (const item of items) if (!seen.has(item.id)) result.push({ item, shown: false });
  return result;
}

function sectionLayouts(layout: VersionLayout) {
  return new Map(layout.sections.map((s) => [s.id, s]));
}

/** The resume as one version shows it: only its shown items, in its order. */
export function applyLayout(content: ResumeContent, layout: VersionLayout): ResumeContent {
  const sectionsById = sectionLayouts(layout);
  const shownOnly = <T extends { id: string }>(items: T[], layoutItems: LayoutItem[] | undefined) =>
    ordered(items, layoutItems)
      .filter((x) => x.shown)
      .map((x) => x.item);

  return {
    personal: { ...content.personal, contacts: shownOnly(content.personal.contacts, layout.contacts) },
    sections: shownOnly(content.sections, layout.sections).map((section): Section =>
      section.type === "profile"
        ? section
        : { ...section, entries: shownOnly(section.entries, sectionsById.get(section.id)?.entries) },
    ),
  };
}

/** Per-contact link display overrides, keyed by contact id. */
export function contactLinkDisplays(layout: VersionLayout): Record<string, LinkDisplay> {
  const result: Record<string, LinkDisplay> = {};
  for (const contact of layout.contacts) if (contact.linkDisplay) result[contact.id] = contact.linkDisplay;
  return result;
}

/** A layout showing everything, in content order. */
export function fullLayout(content: ResumeContent, shown = true): VersionLayout {
  return {
    sections: content.sections.map((section) => ({
      id: section.id,
      shown,
      entries: section.type === "profile" ? [] : section.entries.map((entry) => ({ id: entry.id, shown })),
    })),
    contacts: content.personal.contacts.map((contact) => ({ id: contact.id, shown })),
  };
}

/** Drops ids that no longer exist and adds missing ones (hidden) right after their nearest earlier sibling. */
function reconcileList<T extends LayoutItem>(contentIds: string[], list: readonly T[], make: (itemId: string) => T): T[] {
  const valid = new Set(contentIds);
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of list) {
    if (!valid.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  contentIds.forEach((itemId, index) => {
    if (seen.has(itemId)) return;
    let at = 0;
    for (let i = index - 1; i >= 0; i--) {
      const position = result.findIndex((r) => r.id === contentIds[i]);
      if (position !== -1) {
        at = position + 1;
        break;
      }
    }
    result.splice(at, 0, make(itemId));
    seen.add(itemId);
  });
  return result;
}

/** Brings a layout in line with the content, keeping every choice it already made. */
export function reconcileLayout(content: ResumeContent, layout: VersionLayout): VersionLayout {
  const existing = sectionLayouts(layout);
  const entryIds = (section: Section) => (section.type === "profile" ? [] : section.entries.map((e) => e.id));
  const sections = reconcileList(
    content.sections.map((s) => s.id),
    layout.sections,
    (sectionId) => ({ id: sectionId, shown: false, entries: [] }),
  ).map((sectionLayout) => {
    const section = content.sections.find((s) => s.id === sectionLayout.id)!;
    const current = existing.get(section.id)?.entries ?? [];
    return {
      ...sectionLayout,
      entries: reconcileList(entryIds(section), current, (entryId) => ({ id: entryId, shown: false })),
    };
  });
  const contacts = reconcileList(
    content.personal.contacts.map((c) => c.id),
    layout.contacts,
    (contactId) => ({ id: contactId, shown: false }),
  );
  return { sections, contacts };
}

// ---------- Edits (run inside immer recipes) ----------

function newLayoutItem(scope: ItemScope, itemId: string, shown: boolean): LayoutItem {
  if (scope.kind !== "section") return { id: itemId, shown };
  const section: SectionLayout = { id: itemId, shown, entries: [] };
  return section;
}

/** Returns the list for a scope, creating a missing section layout so edits always have somewhere to land. */
function ensureList(layout: VersionLayout, scope: ItemScope): LayoutItem[] {
  if (scope.kind !== "entry") return layoutList(layout, scope)!;
  let section = layout.sections.find((s) => s.id === scope.sectionId);
  if (!section) {
    section = { id: scope.sectionId, shown: false, entries: [] };
    layout.sections.push(section);
  }
  return section.entries;
}

/**
 * Adds a new item to every version: shown in the active one, hidden in the rest. It goes right after
 * `afterId` (the item it follows in the active version) or at the end.
 */
export function addToVersions<T extends LayoutItem>(
  versions: ResumeVersion[],
  scope: ItemScope,
  activeVersionId: string,
  afterId: string | null,
  make: (version: ResumeVersion, shown: boolean) => T,
) {
  for (const version of versions) {
    const list = ensureList(version.layout, scope) as T[];
    const after = afterId ? list.findIndex((item) => item.id === afterId) : -1;
    list.splice(after === -1 ? list.length : after + 1, 0, make(version, version.id === activeVersionId));
  }
}

export function removeFromVersions(versions: ResumeVersion[], scope: ItemScope, itemId: string) {
  for (const version of versions) {
    if (scope.kind === "section") {
      version.layout.sections = version.layout.sections.filter((s) => s.id !== itemId);
    } else if (scope.kind === "contact") {
      version.layout.contacts = version.layout.contacts.filter((c) => c.id !== itemId);
    } else {
      const section = version.layout.sections.find((s) => s.id === scope.sectionId);
      if (section) section.entries = section.entries.filter((e) => e.id !== itemId);
    }
  }
}

export function setShown(layout: VersionLayout, scope: ItemScope, itemId: string, shown: boolean) {
  const list = ensureList(layout, scope);
  const item = list.find((i) => i.id === itemId);
  if (item) item.shown = shown;
  else list.push(newLayoutItem(scope, itemId, shown));
}

/** Moves `activeId` to where `overId` sits, given the full list of ids in the version's current order. */
export function moveInLayout(
  layout: VersionLayout,
  scope: ItemScope,
  orderedIds: string[],
  activeId: string,
  overId: string,
) {
  const from = orderedIds.indexOf(activeId);
  const to = orderedIds.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return;
  const nextIds = [...orderedIds];
  nextIds.splice(to, 0, ...nextIds.splice(from, 1));

  const list = ensureList(layout, scope);
  const byId = new Map(list.map((item) => [item.id, item]));
  const rebuilt = nextIds.map((itemId) => byId.get(itemId) ?? newLayoutItem(scope, itemId, false));
  list.splice(0, list.length, ...rebuilt);
}

// ---------- Naming ----------

export function defaultFileName(personalName: string) {
  const name = personalName.trim();
  return name ? `${name} - Resume` : "Resume";
}

export function downloadFileName(fileName: string, personalName: string) {
  return (fileName.trim() || defaultFileName(personalName)).replace(/[\\/:*?"<>|]+/g, "-");
}
