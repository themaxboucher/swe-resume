"use client";

import { Building2Icon, FileTextIcon, UserIcon } from "lucide-react";
import { useId } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { CoverLetterContent } from "@/lib/documents/schema";
import { useDocument } from "./document-store";
import { EditorCard } from "./editor-card";
import { Field, TextField } from "./fields";
import { PersonalFields } from "./personal-fields";
import { RichTextEditor } from "./rich-text-editor";

type Doc = CoverLetterContent;

function CardIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex size-7 items-center justify-center text-muted-foreground [&_svg]:size-4">{children}</span>;
}

export function CoverLetterForm() {
  const content = useDocument<Doc, Doc>((s) => s.content);
  const update = useDocument<Doc, (recipe: (draft: Doc) => void) => void>((s) => s.updateContent);
  const addressId = useId();
  const dateId = useId();

  const set = <K extends keyof Doc>(key: K, value: Doc[K]) =>
    update((draft) => {
      draft[key] = value;
    });

  return (
    <div className="flex flex-col gap-3">
      <EditorCard
        title="Your details"
        subtitle={content.sender.name || "Name, contact info"}
        leading={
          <CardIcon>
            <UserIcon />
          </CardIcon>
        }
      >
        <PersonalFields value={content.sender} update={(recipe) => update((draft) => recipe(draft.sender))} />
      </EditorCard>

      <EditorCard
        defaultOpen
        title="Recipient"
        subtitle={content.recipient.company || "Company, hiring manager"}
        leading={
          <CardIcon>
            <Building2Icon />
          </CardIcon>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField
            label="Hiring manager"
            value={content.recipient.name}
            placeholder="Jordan Lee"
            onChange={(v) => update((d) => void (d.recipient.name = v))}
          />
          <TextField
            label="Their title"
            value={content.recipient.title}
            placeholder="Engineering Manager"
            onChange={(v) => update((d) => void (d.recipient.title = v))}
          />
          <TextField
            label="Company"
            value={content.recipient.company}
            placeholder="Acme Inc."
            onChange={(v) => update((d) => void (d.recipient.company = v))}
            className="sm:col-span-2"
          />
          <Field label="Address" htmlFor={addressId} className="sm:col-span-2">
            <Textarea
              id={addressId}
              rows={2}
              value={content.recipient.address}
              placeholder={"123 Main St\nToronto, ON"}
              onChange={(e) => update((d) => void (d.recipient.address = e.target.value))}
              className="bg-card"
            />
          </Field>
        </div>
      </EditorCard>

      <EditorCard
        defaultOpen
        title="Letter"
        subtitle={content.subject || "Date, subject, body, sign-off"}
        leading={
          <CardIcon>
            <FileTextIcon />
          </CardIcon>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Date" htmlFor={dateId}>
            <input
              id={dateId}
              type="date"
              value={content.date}
              onChange={(e) => set("date", e.target.value)}
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20"
            />
          </Field>
          <TextField
            label="Subject"
            value={content.subject}
            placeholder="Application for Senior Engineer"
            onChange={(v) => set("subject", v)}
          />
          <TextField
            label="Greeting"
            value={content.greeting}
            placeholder="Dear Jordan,"
            onChange={(v) => set("greeting", v)}
            className="sm:col-span-2"
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Body</span>
            <RichTextEditor
              aria-label="Letter body"
              value={content.body}
              onChange={(v) => set("body", v)}
              minHeight={280}
              placeholder="Open with why this role and company, show two or three relevant wins, and close with a clear next step."
            />
          </div>
          <TextField
            label="Closing"
            value={content.closing}
            placeholder="Sincerely,"
            onChange={(v) => set("closing", v)}
          />
          <TextField
            label="Signature"
            value={content.signature}
            placeholder="Ada Lovelace"
            onChange={(v) => set("signature", v)}
          />
        </div>
      </EditorCard>
    </div>
  );
}
