"use client";

import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PlusIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { newSection } from "@/lib/documents/defaults";
import { DEFAULT_CURRENT_LABEL, formatDateRange } from "@/lib/documents/format";
import type { DateFormat, Entry, ListSection, ResumeContent, Section, SectionType } from "@/lib/documents/schema";
import { LIST_SECTION_TYPES } from "@/lib/documents/schema";
import { SECTION_CONFIG, SECTION_LABELS, emptyEntry, newId } from "@/lib/documents/sections";
import { useDocument, useDocumentStoreApi } from "./document-store";
import { EditorCard } from "./editor-card";
import { LinkableTextField, MonthField, TextField } from "./fields";
import { PersonalFields } from "./personal-fields";
import { RichTextEditor } from "./rich-text-editor";
import { DragHandle, SortableItem, SortableList, arrayMove } from "./sortable";
import { SectionIcon } from "./section-icon";

type Doc = ResumeContent;

function useUpdate() {
  return useDocument<Doc, (recipe: (draft: Doc) => void) => void>((s) => s.updateContent);
}

function useUndoToast() {
  const store = useDocumentStoreApi<Doc>();
  return (message: string) =>
    toast(message, { action: { label: "Undo", onClick: () => store.temporal.getState().undo() } });
}

export function ResumeForm() {
  const sections = useDocument<Doc, Section[]>((s) => s.content.sections);
  const update = useUpdate();
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <PersonalCard />
      <SortableList
        items={sections}
        onReorder={(from, to) =>
          update((draft) => {
            draft.sections = arrayMove(draft.sections, from, to);
          })
        }
      >
        {sections.map((section) => (
          <SortableItem key={section.id} id={section.id}>
            {(handle) => (
              <SectionCard
                section={section}
                defaultOpen={section.id === recentlyAdded}
                leading={<DragHandle {...handle} label={`Reorder ${section.title || "section"}`} />}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
      <AddSectionMenu
        onAdd={(type) => {
          const section = newSection(type);
          update((draft) => {
            draft.sections.push(section);
          });
          setRecentlyAdded(section.id);
        }}
      />
    </div>
  );
}

function PersonalCard() {
  const personal = useDocument<Doc, Doc["personal"]>((s) => s.content.personal);
  const update = useUpdate();
  return (
    <EditorCard
      defaultOpen
      title="Personal details"
      subtitle={personal.name || "Name, contact info"}
      leading={
        <span className="flex size-7 items-center justify-center text-muted-foreground">
          <UserIcon className="size-4" />
        </span>
      }
    >
      <PersonalFields value={personal} update={(recipe) => update((draft) => recipe(draft.personal))} />
    </EditorCard>
  );
}

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
  leading,
  defaultOpen,
}: {
  section: Section;
  leading: React.ReactNode;
  defaultOpen: boolean;
}) {
  const update = useUpdate();
  const undoToast = useUndoToast();

  const patch = (recipe: (draft: Section) => void) =>
    update((draft) => {
      const target = draft.sections.find((s) => s.id === section.id);
      if (target) recipe(target);
    });

  const entryCount = section.type === "profile" ? null : section.entries.length;

  return (
    <EditorCard
      defaultOpen={defaultOpen}
      muted={!section.visible}
      title={section.title || SECTION_LABELS[section.type]}
      subtitle={
        entryCount === null
          ? SECTION_LABELS[section.type]
          : `${entryCount} ${entryCount === 1 ? "entry" : "entries"}`
      }
      leading={leading}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label={`${section.title} options`} />}
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => patch((s) => void (s.visible = !s.visible))}>
              {section.visible ? <EyeOffIcon /> : <EyeIcon />}
              {section.visible ? "Hide section" : "Show section"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                update((draft) => {
                  draft.sections = draft.sections.filter((s) => s.id !== section.id);
                });
                undoToast(`Deleted “${section.title || SECTION_LABELS[section.type]}”`);
              }}
            >
              <Trash2Icon /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
  );
}

function EntryList({ section }: { section: ListSection }) {
  const update = useUpdate();
  const config = SECTION_CONFIG[section.type];
  const [recentlyAdded, setRecentlyAdded] = useState<string | null>(null);

  const patchSection = (recipe: (draft: ListSection) => void) =>
    update((draft) => {
      const target = draft.sections.find((s) => s.id === section.id);
      if (target && target.type !== "profile") recipe(target);
    });

  return (
    <div className="flex flex-col gap-2">
      <SortableList
        items={section.entries}
        onReorder={(from, to) => patchSection((s) => void (s.entries = arrayMove(s.entries, from, to)))}
      >
        {section.entries.map((entry) => (
          <SortableItem key={entry.id} id={entry.id}>
            {(handle) => (
              <EntryCard
                entry={entry}
                section={section}
                defaultOpen={entry.id === recentlyAdded}
                patchSection={patchSection}
                leading={<DragHandle {...handle} label={`Reorder ${entry.title || config.emptyTitle}`} />}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
      {section.entries.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">Nothing here yet. Empty sections are hidden from the document.</p>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="self-start text-primary hover:bg-accent hover:text-primary"
        onClick={() => {
          const entry = emptyEntry();
          patchSection((s) => void s.entries.push(entry));
          setRecentlyAdded(entry.id);
        }}
      >
        <PlusIcon /> {config.addLabel}
      </Button>
    </div>
  );
}

function EntryCard({
  entry,
  section,
  leading,
  defaultOpen,
  patchSection,
}: {
  entry: Entry;
  section: ListSection;
  leading: React.ReactNode;
  defaultOpen: boolean;
  patchSection: (recipe: (draft: ListSection) => void) => void;
}) {
  const config = SECTION_CONFIG[section.type];
  const undoToast = useUndoToast();
  const designDateFormat = useDocument<Doc, DateFormat>((s) => s.design.dateFormat);

  const patch = <K extends keyof Entry>(key: K, value: Entry[K]) =>
    patchSection((s) => {
      const target = s.entries.find((e) => e.id === entry.id);
      if (target) target[key] = value;
    });

  const dates = formatDateRange(entry.startDate, entry.endDate, entry.current, designDateFormat, entry.currentLabel);
  const subtitle = [entry.subtitle || entry.level, dates].filter(Boolean).join(" · ");

  return (
    <EditorCard
      className="bg-background shadow-none ring-1 ring-border"
      defaultOpen={defaultOpen}
      muted={!entry.visible}
      title={entry.title || <span className="text-muted-foreground">{config.emptyTitle}</span>}
      subtitle={subtitle || undefined}
      leading={leading}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Entry options" />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => patch("visible", !entry.visible)}>
              {entry.visible ? <EyeOffIcon /> : <EyeIcon />}
              {entry.visible ? "Hide entry" : "Show entry"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                patchSection((s) => {
                  const index = s.entries.findIndex((e) => e.id === entry.id);
                  s.entries.splice(index + 1, 0, { ...structuredClone(entry), id: newId() });
                })
              }
            >
              <CopyIcon /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                patchSection((s) => void (s.entries = s.entries.filter((e) => e.id !== entry.id)));
                undoToast(`Deleted “${entry.title || config.emptyTitle}”`);
              }}
            >
              <Trash2Icon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
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
                    <span className="text-xs text-muted-foreground">
                      e.g. “Present”, “Now” or “Expected May 2027”
                    </span>
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
    </EditorCard>
  );
}
