"use client";

import {
  ChevronDownIcon,
  CopyIcon,
  EyeOffIcon,
  InfoIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { hasLinkChoice } from "@/lib/documents/contacts";
import { newSection } from "@/lib/documents/defaults";
import { DEFAULT_CURRENT_LABEL, formatDateRange } from "@/lib/documents/format";
import type { ContactField, Entry, LinkDisplay, ListSection, Section, SectionType } from "@/lib/documents/schema";
import { LIST_SECTION_TYPES } from "@/lib/documents/schema";
import { SECTION_CONFIG, SECTION_LABELS, emptyEntry } from "@/lib/documents/sections";
import { isShown, ordered, type ItemScope } from "@/lib/documents/versions";
import { EditorCard } from "./editor-card";
import { LinkableTextField, MonthField, TextField } from "./fields";
import { useEditorHistory } from "./history";
import { ContactList, contactName } from "./personal-fields";
import {
  addContact,
  addEntry,
  addSection,
  deleteItem,
  duplicateEntry,
  duplicateSection,
  getActiveVersion,
  moveItem,
  setShownIn,
  useActiveVersion,
  useResume,
  useResumeStoreApi,
  useUpdate,
} from "./resume-store";
import { RichTextEditor } from "./rich-text-editor";
import { SectionIcon } from "./section-icon";
import { DragHandle, SortableItem, SortableList } from "./sortable";
import { VisibilityControls } from "./version-controls";

const SECTION_SCOPE: ItemScope = { kind: "section" };
const CONTACT_SCOPE: ItemScope = { kind: "contact" };

export function ResumeForm() {
  const sections = useResume((s) => s.content.sections);
  const versionCount = useResume((s) => s.versions.length);
  const version = useActiveVersion();
  const update = useUpdate();
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [collapseHidden, setCollapseHidden] = useState(false);

  const items = useMemo(() => ordered(sections, version.layout.sections), [sections, version.layout.sections]);
  const hiddenCount = items.filter((x) => !x.shown).length;
  const listed = collapseHidden ? items.filter((x) => x.shown) : items;

  return (
    <div className="flex flex-col gap-3">
      {versionCount > 1 && (
        <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
          <InfoIcon className="mt-px size-3.5 shrink-0" />
          <span>
            Text you edit changes every version. What&apos;s shown and its order apply to{" "}
            <span className="font-semibold text-foreground">{version.name}</span>.
          </span>
        </p>
      )}
      <PersonalCard />
      <SortableList
        items={listed.map((x) => x.item)}
        onReorder={(from, to) => update((draft) => moveItem(draft, SECTION_SCOPE, listed[from].item.id, listed[to].item.id))}
      >
        {listed.map(({ item: section, shown }) => (
          <SortableItem key={section.id} id={section.id}>
            {(handle) => (
              <SectionCard
                section={section}
                shown={shown}
                defaultOpen={section.id === recentlyAdded}
                leading={<DragHandle {...handle} label={`Reorder ${section.title || "section"}`} />}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
      {hiddenCount > 0 && (
        <HiddenToggle
          count={hiddenCount}
          noun={["hidden section", "hidden sections"]}
          collapsed={collapseHidden}
          onToggle={() => setCollapseHidden((c) => !c)}
        />
      )}
      <AddSectionMenu
        onAdd={(type) => {
          const section = newSection(type);
          update((draft) => addSection(draft, section));
          setRecentlyAdded(section.id);
          setCollapseHidden(false);
        }}
      />
    </div>
  );
}

/** "Hide 2 hidden entries" / "Show 2 hidden entries": collapses items the version doesn't show. */
function HiddenToggle({
  count,
  noun,
  collapsed,
  onToggle,
}: {
  count: number;
  noun: [singular: string, plural: string];
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <EyeOffIcon className="size-3.5" />
      {collapsed ? "Show" : "Hide"} {count} {count === 1 ? noun[0] : noun[1]}
      <ChevronDownIcon className={`size-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`} />
    </button>
  );
}

// ---------- Deleting ----------

/**
 * Deleting removes an item from every version. When other versions show it, confirm first and offer to
 * hide it here instead.
 */
function useDeleteItem() {
  const store = useResumeStoreApi();
  const update = useUpdate();
  const { undo } = useEditorHistory();
  const [pending, setPending] = useState<{
    scope: ItemScope;
    id: string;
    label: string;
    others: string[];
    shownHere: boolean;
    versionName: string;
  } | null>(null);

  const remove = (scope: ItemScope, id: string, label: string) => {
    update((draft) => deleteItem(draft, scope, id));
    toast(`Deleted “${label}”`, { action: { label: "Undo", onClick: undo } });
  };

  const request = (scope: ItemScope, id: string, label: string) => {
    const state = store.getState();
    const active = getActiveVersion(state);
    const others = state.versions.filter((v) => v.id !== active.id && isShown(v.layout, scope, id)).map((v) => v.name);
    if (others.length === 0) remove(scope, id, label);
    else setPending({ scope, id, label, others, shownHere: isShown(active.layout, scope, id), versionName: active.name });
  };

  const close = () => setPending(null);
  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{pending?.label}” from every version?</AlertDialogTitle>
          <AlertDialogDescription>
            {pending?.shownHere
              ? `It's also shown in ${listNames(pending.others)}. To take it out of “${pending.versionName}” only, hide it instead.`
              : `It's still shown in ${pending && listNames(pending.others)}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {pending?.shownHere && (
            <Button
              variant="outline"
              onClick={() => {
                update((draft) => setShownIn(draft, draft.activeVersionId, pending.scope, pending.id, false));
                close();
              }}
            >
              Hide here instead
            </Button>
          )}
          <AlertDialogAction
            className="bg-destructive text-white shadow-none hover:bg-destructive/90"
            onClick={() => {
              if (pending) remove(pending.scope, pending.id, pending.label);
              close();
            }}
          >
            Delete everywhere
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { request, dialog };
}

function listNames(names: string[]) {
  const quoted = names.map((n) => `“${n}”`);
  if (quoted.length <= 1) return quoted.join("");
  if (quoted.length <= 3) return `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`;
  return `${quoted.slice(0, 2).join(", ")} and ${quoted.length - 2} other versions`;
}

// ---------- Personal details ----------

function PersonalCard() {
  const personal = useResume((s) => s.content.personal);
  const version = useActiveVersion();
  const update = useUpdate();
  const { request, dialog } = useDeleteItem();
  const items = useMemo(
    () => ordered(personal.contacts, version.layout.contacts).map(({ item, shown }) => ({ contact: item, shown })),
    [personal.contacts, version.layout.contacts],
  );
  const shownCount = items.filter((x) => x.shown).length;

  return (
    <>
      <EditorCard
        defaultOpen
        title="Personal details"
        subtitle={
          personal.name
            ? `${personal.name} · ${shownCount} of ${items.length} contact details shown`
            : "Name, contact info"
        }
        leading={
          <span className="flex size-7 items-center justify-center text-muted-foreground">
            <UserIcon className="size-4" />
          </span>
        }
      >
        <div className="flex flex-col gap-5">
          <TextField
            label="Full name"
            value={personal.name}
            onChange={(v) => update((d) => void (d.content.personal.name = v))}
            placeholder="Ada Lovelace"
          />
          <ContactList
            items={items}
            onReorder={(activeId, overId) => update((draft) => moveItem(draft, CONTACT_SCOPE, activeId, overId))}
            onAdd={(contact) => update((draft) => addContact(draft, contact))}
            onChange={(id, recipe) =>
              update((draft) => {
                const contact = draft.content.personal.contacts.find((c) => c.id === id);
                if (contact) recipe(contact);
              })
            }
            onRemove={(contact) => request(CONTACT_SCOPE, contact.id, contactName(contact))}
            controls={(contact) => (
              <VisibilityControls compact scope={CONTACT_SCOPE} itemId={contact.id} label={contactName(contact)} />
            )}
            menu={(contact) => <LinkDisplayMenu contact={contact} />}
          />
        </div>
      </EditorCard>
      {dialog}
    </>
  );
}

const LINK_DISPLAY_LABELS: Record<LinkDisplay, string> = { label: "Label", url: "Full URL" };

/** Per-contact "Show as" override of the version's link display. */
function LinkDisplayMenu({ contact }: { contact: ContactField }) {
  const version = useActiveVersion();
  const update = useUpdate();
  if (!hasLinkChoice(contact)) return null;
  const override = version.layout.contacts.find((c) => c.id === contact.id)?.linkDisplay;

  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuLabel>Show in {version.name} as</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={override ?? "default"}
          onValueChange={(value) =>
            update((draft) => {
              const layout = draft.versions.find((v) => v.id === version.id)?.layout;
              const item = layout?.contacts.find((c) => c.id === contact.id);
              if (item) item.linkDisplay = value === "default" ? undefined : (value as LinkDisplay);
            })
          }
        >
          <DropdownMenuRadioItem value="default">
            Version setting
            <span className="ml-auto pl-3 text-xs text-muted-foreground">
              {LINK_DISPLAY_LABELS[version.design.linkDisplay]}
            </span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="label">{contact.value.trim() || "Label"}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="url">Full URL</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  );
}

// ---------- Sections ----------

function AddSectionMenu({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const types: SectionType[] = ["profile", ...LIST_SECTION_TYPES];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="dashed-panel flex h-12 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-primary"
          />
        }
      >
        <PlusIcon className="size-4" /> Add section
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        {types.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <SectionIcon type={type} />
            {SECTION_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionCard({
  section,
  shown,
  leading,
  defaultOpen,
}: {
  section: Section;
  shown: boolean;
  leading: ReactNode;
  defaultOpen: boolean;
}) {
  const update = useUpdate();
  const version = useActiveVersion();
  const { request, dialog } = useDeleteItem();
  const label = section.title || SECTION_LABELS[section.type];

  const patch = (recipe: (draft: Section) => void) =>
    update((draft) => {
      const target = draft.content.sections.find((s) => s.id === section.id);
      if (target) recipe(target);
    });

  let subtitle = SECTION_LABELS[section.type];
  if (section.type !== "profile") {
    const total = section.entries.length;
    const entryLayouts = version.layout.sections.find((s) => s.id === section.id)?.entries ?? [];
    const shownEntries = section.entries.filter((e) => entryLayouts.some((l) => l.id === e.id && l.shown)).length;
    subtitle =
      shownEntries < total ? `${shownEntries} of ${total} entries shown` : `${total} ${total === 1 ? "entry" : "entries"}`;
  }
  if (!shown) subtitle = `Hidden in ${version.name} · ${subtitle}`;

  return (
    <>
      <EditorCard
        defaultOpen={defaultOpen}
        muted={!shown}
        title={label}
        subtitle={subtitle}
        leading={leading}
        actions={
          <>
            <VisibilityControls scope={SECTION_SCOPE} itemId={section.id} label={label} />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${label} options`} />}>
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onClick={() => {
                    update((draft) => void duplicateSection(draft, section.id));
                    toast(`Duplicated “${label}”`, { description: `The copy is shown in ${version.name} only.` });
                  }}
                >
                  <CopyIcon /> Duplicate section
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => request(SECTION_SCOPE, section.id, label)}>
                  <Trash2Icon /> Delete section
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField
            label="Section title"
            value={section.title}
            onChange={(title) => patch((s) => void (s.title = title))}
            placeholder={SECTION_LABELS[section.type]}
          />
          {section.type === "profile" ? (
            <RichTextEditor
              aria-label="Profile summary"
              value={section.content}
              onChange={(content) =>
                patch((s) => {
                  if (s.type === "profile") s.content = content;
                })
              }
              placeholder="Two or three sentences on who you are, what you're great at, and what you're looking for."
              minHeight={120}
            />
          ) : (
            <EntryList section={section} />
          )}
        </div>
      </EditorCard>
      {/* Outside the card: its body unmounts while collapsed. */}
      {dialog}
    </>
  );
}

// ---------- Entries ----------

function EntryList({ section }: { section: ListSection }) {
  const update = useUpdate();
  const version = useActiveVersion();
  const config = SECTION_CONFIG[section.type];
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);
  const [collapseHidden, setCollapseHidden] = useState(false);
  const { request, dialog } = useDeleteItem();
  const scope = useMemo<ItemScope>(() => ({ kind: "entry", sectionId: section.id }), [section.id]);

  const sectionLayout = version.layout.sections.find((s) => s.id === section.id);
  const items = useMemo(() => ordered(section.entries, sectionLayout?.entries), [section.entries, sectionLayout?.entries]);
  const hiddenCount = items.filter((x) => !x.shown).length;
  const listed = collapseHidden ? items.filter((x) => x.shown) : items;

  return (
    <div className="flex flex-col gap-2">
      <SortableList
        items={listed.map((x) => x.item)}
        onReorder={(from, to) => update((draft) => moveItem(draft, scope, listed[from].item.id, listed[to].item.id))}
      >
        {listed.map(({ item: entry, shown }) => (
          <SortableItem key={entry.id} id={entry.id}>
            {(handle) => (
              <EntryCard
                entry={entry}
                section={section}
                shown={shown}
                scope={scope}
                defaultOpen={entry.id === recentlyAdded}
                onDelete={(label) => request(scope, entry.id, label)}
                leading={<DragHandle {...handle} label={`Reorder ${entry.title || config.emptyTitle}`} />}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
      {section.entries.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">Nothing here yet. Empty sections are hidden from the document.</p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-accent hover:text-primary"
          onClick={() => {
            const entry = emptyEntry();
            update((draft) => addEntry(draft, section.id, entry));
            setRecentlyAdded(entry.id);
          }}
        >
          <PlusIcon /> {config.addLabel}
        </Button>
        {hiddenCount > 0 && (
          <HiddenToggle
            count={hiddenCount}
            noun={["hidden entry", "hidden entries"]}
            collapsed={collapseHidden}
            onToggle={() => setCollapseHidden((c) => !c)}
          />
        )}
      </div>
      {dialog}
    </div>
  );
}

function EntryCard({
  entry,
  section,
  shown,
  scope,
  leading,
  defaultOpen,
  onDelete,
}: {
  entry: Entry;
  section: ListSection;
  shown: boolean;
  scope: ItemScope;
  leading: ReactNode;
  defaultOpen: boolean;
  onDelete: (label: string) => void;
}) {
  const config = SECTION_CONFIG[section.type];
  const update = useUpdate();
  const version = useActiveVersion();
  const label = entry.title || config.emptyTitle;

  const patch = <K extends keyof Entry>(key: K, value: Entry[K]) =>
    update((draft) => {
      const target = draft.content.sections.find((s) => s.id === section.id);
      if (!target || target.type === "profile") return;
      const draftEntry = target.entries.find((e) => e.id === entry.id);
      if (draftEntry) draftEntry[key] = value;
    });

  const dates = formatDateRange(entry.startDate, entry.endDate, entry.current, version.design.dateFormat, entry.currentLabel);
  const subtitleText = config.fields.includes("subtitle") ? entry.subtitle : "";
  const subtitle = [subtitleText || entry.level, dates].filter(Boolean).join(" · ");

  return (
    <EditorCard
      className="bg-background shadow-none ring-1 ring-border"
      defaultOpen={defaultOpen}
      muted={!shown}
      title={entry.title || <span className="text-muted-foreground">{config.emptyTitle}</span>}
      subtitle={subtitle || undefined}
      leading={leading}
      actions={
        <>
          <VisibilityControls scope={scope} itemId={entry.id} label={label} />
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`${label} options`} />}>
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => update((draft) => duplicateEntry(draft, section.id, entry.id))}>
                <CopyIcon /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(label)}>
                <Trash2Icon /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <EntryFields entry={entry} section={section} patch={patch} />
    </EditorCard>
  );
}

function EntryFields({
  entry,
  section,
  patch,
}: {
  entry: Entry;
  section: ListSection;
  patch: <K extends keyof Entry>(key: K, value: Entry[K]) => void;
}) {
  const config = SECTION_CONFIG[section.type];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {config.fields.map((field) => {
        if (field === "dates") {
          return (
            <div key="dates" className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
              <MonthField label="Start date" value={entry.startDate} onChange={(v) => patch("startDate", v)} />
              {entry.current ? (
                <TextField
                  label="Shown as end date"
                  value={entry.currentLabel}
                  onChange={(v) => patch("currentLabel", v)}
                  placeholder={DEFAULT_CURRENT_LABEL}
                />
              ) : (
                <MonthField label="End date" value={entry.endDate} onChange={(v) => patch("endDate", v)} />
              )}
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  id={`${entry.id}-current`}
                  checked={entry.current}
                  onCheckedChange={(checked) => patch("current", checked)}
                />
                <Label htmlFor={`${entry.id}-current`} className="text-sm font-normal">
                  Ongoing
                </Label>
                {entry.current && (
                  <span className="text-xs text-muted-foreground">e.g. “Present”, “Now” or “Expected May 2027”</span>
                )}
              </div>
            </div>
          );
        }
        if (field === "description") {
          return (
            <div key="description" className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <RichTextEditor
                aria-label="Description"
                value={entry.description}
                onChange={(v) => patch("description", v)}
                placeholder="Use a bulleted list: lead with impact, add numbers where you can."
              />
            </div>
          );
        }
        const meta = config.labels[field];
        if (field === "title" && config.linkTitle) {
          return (
            <LinkableTextField
              key={field}
              label={meta?.label ?? field}
              placeholder={meta?.placeholder}
              value={entry.title}
              url={entry.url}
              onChange={(v) => patch("title", v)}
              onUrlChange={(v) => patch("url", v)}
              urlPlaceholder={config.labels.url?.placeholder}
              className="sm:col-span-2"
            />
          );
        }
        // Schools aren't linked; every other subtitle (employer, issuer…) can be.
        if (field === "subtitle" && section.type !== "education") {
          return (
            <LinkableTextField
              key={field}
              label={meta?.label ?? field}
              placeholder={meta?.placeholder}
              value={entry.subtitle}
              url={entry.subtitleUrl}
              onChange={(v) => patch("subtitle", v)}
              onUrlChange={(v) => patch("subtitleUrl", v)}
              urlPlaceholder="company.com"
            />
          );
        }
        return (
          <TextField
            key={field}
            label={meta?.label ?? field}
            placeholder={meta?.placeholder}
            value={entry[field]}
            onChange={(v) => patch(field, v)}
            className={config.compact && field === "level" ? "sm:col-span-1" : undefined}
          />
        );
      })}
    </div>
  );
}
