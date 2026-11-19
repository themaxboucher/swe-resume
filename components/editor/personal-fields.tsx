"use client";

import { Link2OffIcon, LinkIcon, PlusIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { useState, type HTMLAttributes } from "react";
import { toast } from "sonner";
import { CONTACT_ICON_COMPONENTS, CONTACT_ICON_LABELS } from "@/components/document/contact-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CONTACT_META, contactIcon, newContact } from "@/lib/documents/contacts";
import { displayUrl } from "@/lib/documents/format";
import {
  CONTACT_ICONS,
  type ContactField,
  type ContactIcon,
  type ContactType,
  type PersonalDetails,
} from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import { useDocumentStoreApi } from "./document-store";
import { TextField } from "./fields";
import { DragHandle, SortableItem, SortableList, arrayMove } from "./sortable";

type Update = (recipe: (draft: PersonalDetails) => void) => void;

const ADDABLE_TYPES: ContactType[] = ["email", "phone", "location", "website", "linkedin", "github"];

export function PersonalFields({ value, update }: { value: PersonalDetails; update: Update }) {
  const store = useDocumentStoreApi();
  const [focusId, setFocusId] = useState<string | null>(null);

  const updateContact = (id: string, recipe: (contact: ContactField) => void) =>
    update((draft) => {
      const contact = draft.contacts.find((c) => c.id === id);
      if (contact) recipe(contact);
    });

  const addContact = (type: ContactType) => {
    const contact = newContact(type);
    update((draft) => {
      draft.contacts.push(contact);
    });
    setFocusId(contact.id);
  };

  const removeContact = (contact: ContactField) => {
    update((draft) => {
      draft.contacts = draft.contacts.filter((c) => c.id !== contact.id);
    });
    const name = contact.type === "custom" ? contact.value || "Custom field" : CONTACT_META[contact.type].label;
    toast(`${name} removed`, { action: { label: "Undo", onClick: () => store.temporal.getState().undo() } });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Full name"
          value={value.name}
          onChange={(v) => update((d) => void (d.name = v))}
          placeholder="Ada Lovelace"
        />
        <TextField
          label="Professional title"
          value={value.headline}
          onChange={(v) => update((d) => void (d.headline = v))}
          placeholder="Software Engineer"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">Contact details</span>
          {value.contacts.length > 1 && (
            <span className="text-[11px] text-muted-foreground/80">Drag to reorder</span>
          )}
        </div>

        {value.contacts.length > 0 && (
          <div className="@container flex flex-col divide-y divide-border rounded-lg border border-border">
            <SortableList
              items={value.contacts}
              onReorder={(from, to) =>
                update((draft) => {
                  draft.contacts = arrayMove(draft.contacts, from, to);
                })
              }
            >
              {value.contacts.map((contact) => (
                <SortableItem key={contact.id} id={contact.id} className="first:rounded-t-lg last:rounded-b-lg bg-card">
                  {(handle) => (
                    <ContactRow
                      contact={contact}
                      handle={handle}
                      autoFocus={contact.id === focusId}
                      onChange={(recipe) => updateContact(contact.id, recipe)}
                      onRemove={() => removeContact(contact)}
                    />
                  )}
                </SortableItem>
              ))}
            </SortableList>
          </div>
        )}

        <AddContactMenu contacts={value.contacts} onAdd={addContact} />
      </div>
    </div>
  );
}

function ContactRow({
  contact,
  handle,
  autoFocus,
  onChange,
  onRemove,
}: {
  contact: ContactField;
  handle: { attributes: HTMLAttributes<HTMLElement>; listeners: HTMLAttributes<HTMLElement> | undefined };
  autoFocus: boolean;
  onChange: (recipe: (contact: ContactField) => void) => void;
  onRemove: () => void;
}) {
  const meta = CONTACT_META[contact.type];
  const [linkOpen, setLinkOpen] = useState(false);
  const showLink = meta.link === "always" || (meta.link === "optional" && (linkOpen || contact.url !== ""));
  const name = contact.type === "custom" ? "Custom field" : meta.label;
  const textPlaceholder =
    meta.link === "always" ? (contact.url ? displayUrl(contact.url) : "Text to show (optional)") : meta.placeholder;

  return (
    <div className="flex items-start gap-1 p-1.5">
      <div className="mt-5 flex h-8 items-center">
        <DragHandle {...handle} label={`Reorder ${name}`} />
      </div>
      <IconPicker
        fieldName={name}
        value={contactIcon(contact)}
        suggestions={meta.iconChoices}
        onChange={(icon) => onChange((c) => void (c.icon = icon))}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="px-0.5 text-[11px] leading-4 font-medium text-muted-foreground">{name}</span>
        <div className={cn("grid gap-1.5", showLink && "@md:grid-cols-2")}>
          <Input
            aria-label={meta.link === "always" ? `${name} text` : name}
            value={contact.value}
            placeholder={textPlaceholder}
            autoFocus={autoFocus && meta.link !== "always"}
            type={contact.type === "email" ? "email" : contact.type === "phone" ? "tel" : "text"}
            autoComplete="off"
            onChange={(e) => onChange((c) => void (c.value = e.target.value))}
            className="h-8 bg-card"
          />
          {showLink && (
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label={`${name} link`}
                value={contact.url}
                placeholder={meta.urlPlaceholder}
                autoFocus={(autoFocus && meta.link === "always") || (linkOpen && contact.url === "")}
                autoComplete="off"
                inputMode="url"
                onChange={(e) => onChange((c) => void (c.url = e.target.value))}
                className="h-8 bg-card pl-7"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex h-8 items-center self-end">
        {meta.link === "auto" && (
          <AutoLinkToggle
            scheme={contact.type === "email" ? "mailto:" : "tel:"}
            linked={contact.linked !== false}
            onChange={(linked) => onChange((c) => void (c.linked = linked))}
          />
        )}
        {meta.link === "optional" && (
          <button
            type="button"
            aria-label={showLink ? "Remove link" : "Add link"}
            title={showLink ? "Remove link" : "Add link"}
            aria-pressed={showLink}
            onClick={() => {
              if (showLink) onChange((c) => void (c.url = ""));
              setLinkOpen(!showLink);
            }}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              showLink && "text-primary hover:text-primary",
            )}
          >
            {showLink ? <UnlinkIcon className="size-4" /> : <LinkIcon className="size-4" />}
          </button>
        )}
        <button
          type="button"
          aria-label={`Remove ${name}`}
          title="Remove"
          onClick={onRemove}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Turns the automatic mailto:/tel: link on an email or phone field on and off. */
function AutoLinkToggle({
  scheme,
  linked,
  onChange,
}: {
  scheme: string;
  linked: boolean;
  onChange: (linked: boolean) => void;
}) {
  const label = linked ? `Clickable ${scheme} link. Click to show as plain text` : `Make it a clickable ${scheme} link`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={linked}
      onClick={() => onChange(!linked)}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-colors",
        linked
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {linked ? <LinkIcon className="size-4" /> : <Link2OffIcon className="size-4" />}
    </button>
  );
}

function ContactGlyph({ icon, className }: { icon: ContactIcon; className?: string }) {
  const Icon = CONTACT_ICON_COMPONENTS[icon];
  return <Icon aria-hidden className={cn("size-4", className)} />;
}

function IconPicker({
  fieldName,
  value,
  suggestions,
  onChange,
}: {
  fieldName: string;
  value: ContactIcon;
  /** Variants that suit this field, shown first. */
  suggestions: ContactIcon[];
  onChange: (icon: ContactIcon) => void;
}) {
  const [open, setOpen] = useState(false);
  const others = CONTACT_ICONS.filter((icon) => !suggestions.includes(icon));

  const option = (icon: ContactIcon, large = false) => (
    <button
      key={icon}
      type="button"
      role="radio"
      aria-checked={icon === value}
      aria-label={CONTACT_ICON_LABELS[icon]}
      title={CONTACT_ICON_LABELS[icon]}
      onClick={() => {
        onChange(icon);
        setOpen(false);
      }}
      className={cn(
        "flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        large ? "h-10 gap-2 px-3 text-xs font-medium" : "size-9",
        icon === value && "bg-accent text-primary ring-1 ring-primary hover:bg-accent hover:text-primary",
      )}
    >
      <ContactGlyph icon={icon} className={large ? "size-5" : undefined} />
      {large && CONTACT_ICON_LABELS[icon]}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`${fieldName} icon: ${CONTACT_ICON_LABELS[value]}. Change icon`}
            title="Change icon"
            className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed border-foreground/25 text-foreground transition-colors hover:border-foreground/50 hover:bg-muted aria-expanded:border-primary aria-expanded:text-primary"
          />
        }
      >
        <ContactGlyph icon={value} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[19rem] gap-3 p-2">
        <div role="radiogroup" aria-label={`${fieldName} icon`} className="flex flex-col gap-3">
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-muted-foreground">{fieldName}</span>
              <div className="flex flex-wrap gap-1">{suggestions.map((icon) => option(icon, true))}</div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-xs font-medium text-muted-foreground">
              {suggestions.length > 0 ? "Other icons" : "Icon"}
            </span>
            <div className="grid grid-cols-6 gap-1">{others.map((icon) => option(icon))}</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddContactMenu({ contacts, onAdd }: { contacts: ContactField[]; onAdd: (type: ContactType) => void }) {
  const present = new Set(contacts.map((c) => c.type));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="dashed-panel flex h-9 items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:bg-card hover:text-primary"
          />
        }
      >
        <PlusIcon className="size-4" /> Add contact field
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="center">
        {ADDABLE_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => onAdd(type)}>
            <ContactGlyph icon={CONTACT_META[type].icon} className="text-muted-foreground" />
            {CONTACT_META[type].label}
            {present.has(type) && <span className="ml-auto text-xs text-muted-foreground">Added</span>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAdd("custom")}>
          <PlusIcon className="text-muted-foreground" />
          Custom field
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
