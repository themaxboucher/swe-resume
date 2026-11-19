"use client";

import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { BoldIcon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { RichText } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: RichText | null;
  onChange: (value: RichText | null) => void;
  placeholder?: string;
  minHeight?: number;
  "aria-label"?: string;
};

function isEmptyDoc(editor: Editor) {
  return editor.isEmpty;
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 96, ...props }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value ?? "",
    editorProps: {
      attributes: {
        class: "rt-editor outline-none",
        style: `min-height:${minHeight}px`,
        ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(isEmptyDoc(editor) ? null : (editor.getJSON() as RichText));
    },
  });

  // Sync external changes (undo/redo from the document store) into the editor.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = isEmptyDoc(editor) ? null : editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value ?? "", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="rounded-lg border border-input bg-card transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="px-3 py-2 text-sm" />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5",
        active && "bg-accent text-primary hover:bg-accent hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            link: editor.isActive("link"),
            bulletList: editor.isActive("bulletList"),
            orderedList: editor.isActive("orderedList"),
          }
        : null,
  });

  return (
    <div className="flex items-center gap-0.5 border-b border-border px-1.5 py-1">
      <ToolbarButton label="Bold" active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}>
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}>
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state?.underline}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bulleted list"
        active={state?.bulletList}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state?.orderedList}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <LinkButton editor={editor} active={state?.link} />
    </div>
  );
}

function LinkButton({ editor, active }: { editor: Editor | null; active?: boolean }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const apply = () => {
    if (!editor) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url.trim()) chain.setLink({ href: url.trim() }).run();
    else chain.unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setUrl((editor?.getAttributes("link").href as string | undefined) ?? "");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Link"
            title="Link"
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5",
              active && "bg-accent text-primary",
            )}
          />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      <PopoverContent className="w-72 gap-2 p-3" align="start">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Input
            autoFocus
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8"
          />
          <Button type="submit" size="sm">
            {url.trim() ? "Apply" : "Remove"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
