import type { RichText, RichTextMark, RichTextNode } from "./schema";

// Converts between the editor's rich text (Tiptap JSON) and the small Markdown subset AI apps read and write
// through MCP: paragraphs, line breaks, bullet and numbered lists (nested by indenting), **bold**, *italic*,
// <u>underline</u> and [links](https://…). Anything else stays plain text.

// ---------- Tiptap → Markdown ----------

/** Outermost first, so a mark that spans several text nodes stays open across them. */
const MARK_ORDER = ["link", "bold", "italic", "underline"];

const linkHref = (mark: RichTextMark) => (typeof mark.attrs?.href === "string" ? mark.attrs.href.trim() : "");
const markKey = (mark: RichTextMark) => (mark.type === "link" ? `link:${linkHref(mark)}` : mark.type);

function opener(mark: RichTextMark) {
  return { bold: "**", italic: "_", underline: "<u>", link: "[" }[mark.type] ?? "";
}

function closer(mark: RichTextMark) {
  if (mark.type === "link") return `](${linkHref(mark).replace(/[()\s]/g, encodeURIComponent)})`;
  return { bold: "**", italic: "_", underline: "</u>" }[mark.type] ?? "";
}

/** Escapes what would read as markup. "_" inside a word (snake_case) can't, so it stays as is. */
function escapeText(text: string) {
  return text
    .replace(/[\\*[\]]/g, "\\$&")
    .replace(/<(?=\/?u>)/gi, "\\<")
    .replace(/_/g, (match, offset: number) =>
      isWordChar(text[offset - 1]) && isWordChar(text[offset + 1]) ? match : "\\_",
    );
}

function inlineToMarkdown(nodes: RichTextNode[] = []) {
  let out = "";
  const open: RichTextMark[] = [];
  // Closing markers go before trailing spaces: "**bold** next", never "**bold **next".
  const closeTo = (depth: number) => {
    while (open.length > depth) {
      const trail = /\s*$/.exec(out)![0];
      out = out.slice(0, out.length - trail.length) + closer(open.pop()!) + trail;
    }
  };
  for (const node of nodes) {
    if (node.type === "hardBreak") {
      closeTo(0);
      out += "\n";
      continue;
    }
    if (node.type !== "text" || !node.text) continue;
    const marks = (node.marks ?? [])
      .filter((mark) => MARK_ORDER.includes(mark.type) && (mark.type !== "link" || linkHref(mark)))
      .sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type));
    const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(node.text)!;
    if (!core) {
      out += node.text;
      continue;
    }
    let shared = 0;
    while (shared < open.length && shared < marks.length && markKey(open[shared]) === markKey(marks[shared])) shared++;
    closeTo(shared);
    out += lead;
    for (const mark of marks.slice(shared)) {
      out += opener(mark);
      open.push(mark);
    }
    out += escapeText(core) + trail;
  }
  closeTo(0);
  return out;
}

/** Escapes text at the start of a line that would otherwise read as a list marker. */
function escapeLineStart(line: string) {
  return line.replace(/^(\s*)([-+*]|\d+[.)])(\s)/, "$1\\$2$3");
}

function blockToMarkdown(node: RichTextNode, indent: string): string {
  switch (node.type) {
    case "paragraph":
      return inlineToMarkdown(node.content)
        .split("\n")
        .map((line) => indent + escapeLineStart(line))
        .join("\n");
    case "bulletList":
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : 1;
      return (node.content ?? [])
        .filter((item) => item.type === "listItem")
        .map((item, index) => {
          const marker = node.type === "bulletList" ? "- " : `${start + index}. `;
          const childIndent = indent + " ".repeat(marker.length);
          const [first, ...rest] = item.content ?? [];
          const head = first ? blockToMarkdown(first, childIndent).slice(childIndent.length) : "";
          const tail = rest.map((child) => blockToMarkdown(child, childIndent));
          return [indent + marker + head, ...tail].join("\n");
        })
        .join("\n");
    }
    default:
      return "";
  }
}

export function richTextToMarkdown(doc: RichText | null | undefined): string {
  if (!doc?.content) return "";
  return doc.content
    .map((block) => blockToMarkdown(block, ""))
    .filter((block) => block.trim() !== "")
    .join("\n\n");
}

// ---------- Markdown → Tiptap ----------

type Delimiter = "**" | "__" | "*" | "_" | "<u>" | "</u>";
type Token =
  | { kind: "text"; text: string }
  | { kind: "delim"; value: Delimiter; canOpen: boolean; canClose: boolean; pair?: number }
  | { kind: "link"; href: string; children: Token[] }
  | { kind: "break" };

const MARK_FOR: Record<Delimiter, string> = {
  "**": "bold",
  __: "bold",
  "*": "italic",
  _: "italic",
  "<u>": "underline",
  "</u>": "underline",
};

const isWordChar = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
const isSpace = (ch: string | undefined) => ch === undefined || /\s/.test(ch);

/** Finds the `)` that closes a link target, allowing balanced parentheses inside it. */
function linkEnd(source: string, from: number) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === "(") depth++;
    else if (source[i] === ")") {
      if (depth === 0) return i;
      depth--;
    } else if (source[i] === "\n") return -1;
  }
  return -1;
}

/** Finds the `]` that closes link text, allowing nested brackets. */
function bracketEnd(source: string, from: number) {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === "[") depth++;
    else if (source[i] === "]") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  const pushText = () => {
    if (text) tokens.push({ kind: "text", text });
    text = "";
  };
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "\\" && i + 1 < source.length && /[\\*_[\]<>()`#+\-.!|{}~]/.test(source[i + 1])) {
      text += source[++i];
      continue;
    }
    if (ch === "\n") {
      pushText();
      tokens.push({ kind: "break" });
      continue;
    }
    if (ch === "[") {
      const close = bracketEnd(source, i + 1);
      if (close !== -1 && source[close + 1] === "(") {
        const end = linkEnd(source, close + 2);
        if (end !== -1) {
          const href = source.slice(close + 2, end).trim().replace(/^<|>$/g, "");
          pushText();
          tokens.push({ kind: "link", href, children: tokenize(source.slice(i + 1, close)) });
          i = end;
          continue;
        }
      }
    }
    const tag = /^<\/?u>/i.exec(source.slice(i, i + 4));
    if (tag) {
      pushText();
      const value = tag[0].toLowerCase() === "<u>" ? "<u>" : "</u>";
      tokens.push({ kind: "delim", value, canOpen: value === "<u>", canClose: value === "</u>" });
      i += tag[0].length - 1;
      continue;
    }
    if (ch === "*" || ch === "_") {
      const double = source[i + 1] === ch;
      const value = (double ? ch + ch : ch) as Delimiter;
      const before = source[i - 1];
      const after = source[i + value.length];
      // Emphasis opens before text and closes after it. "_" also needs a word boundary, so snake_case
      // stays as written.
      let canOpen = !isSpace(after);
      let canClose = !isSpace(before);
      if (ch === "_") {
        canOpen &&= !isWordChar(before);
        canClose &&= !isWordChar(after);
      }
      if (canOpen || canClose) {
        pushText();
        tokens.push({ kind: "delim", value, canOpen, canClose });
        i += value.length - 1;
        continue;
      }
      text += value;
      i += value.length - 1;
      continue;
    }
    text += ch;
  }
  pushText();
  return tokens;
}

/** Pairs each closing delimiter with the nearest open one of the same kind; the rest become plain text. */
function pairDelimiters(tokens: Token[]) {
  const open: number[] = [];
  tokens.forEach((token, index) => {
    if (token.kind !== "delim") return;
    if (token.canClose) {
      const want = token.value === "</u>" ? "<u>" : token.value;
      for (let j = open.length - 1; j >= 0; j--) {
        const opener = tokens[open[j]] as Extract<Token, { kind: "delim" }>;
        if (opener.value === want) {
          opener.pair = index;
          token.pair = open[j];
          open.splice(j);
          return;
        }
      }
    }
    if (token.canOpen) open.push(index);
  });
  return tokens.map((token): Token =>
    token.kind === "delim" && token.pair === undefined ? { kind: "text", text: token.value } : token,
  );
}

function sameMarks(a: RichTextMark[] = [], b: RichTextMark[] = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function parseInline(source: string): RichTextNode[] {
  return toInline(pairDelimiters(tokenize(source)));
}

function toInline(tokens: Token[], inherited: RichTextMark[] = [], out: RichTextNode[] = []) {
  const active: RichTextMark[] = [...inherited];
  const push = (text: string) => {
    if (!text) return;
    const marks = active.length ? active.map((m) => ({ ...m })) : undefined;
    const last = out.at(-1);
    if (last?.type === "text" && sameMarks(last.marks, marks)) last.text += text;
    else out.push(marks ? { type: "text", text, marks } : { type: "text", text });
  };
  tokens.forEach((token, index) => {
    if (token.kind === "text") push(token.text);
    else if (token.kind === "break") out.push({ type: "hardBreak" });
    else if (token.kind === "link") {
      const marks = token.href ? [...active, { type: "link", attrs: { href: token.href } }] : [...active];
      toInline(pairDelimiters(token.children), marks, out);
    } else {
      const type = MARK_FOR[token.value];
      const opening = token.pair! > index;
      const at = active.findIndex((m) => m.type === type);
      if (opening && at === -1) active.push({ type });
      else if (!opening && at !== -1) active.splice(at, 1);
    }
  });
  // Trailing line breaks inside a paragraph add nothing.
  while (out.at(-1)?.type === "hardBreak") out.pop();
  return out;
}

type Line = { indent: number; text: string };
const LIST_ITEM = /^([-+*]|(\d+)[.)])\s+(.*)$/;

function paragraph(lines: string[]): RichTextNode | null {
  const content = parseInline(lines.join("\n"));
  return content.length ? { type: "paragraph", content } : null;
}

/** Parses lines that start with a list marker at `indent` (and everything nested under them). */
function parseList(lines: Line[], start: number): { node: RichTextNode; next: number } {
  const first = LIST_ITEM.exec(lines[start].text)!;
  const ordered = first[2] !== undefined;
  const indent = lines[start].indent;
  const items: RichTextNode[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    const match = LIST_ITEM.exec(line.text);
    if (line.indent !== indent || !match || (match[2] !== undefined) !== ordered) break;
    const text = [match[3]];
    const children: RichTextNode[] = [];
    i++;
    // Continuation lines and nested lists belong to this item while they're indented past its marker.
    while (i < lines.length && lines[i].indent > indent) {
      if (LIST_ITEM.test(lines[i].text)) {
        const nested = parseList(lines, i);
        children.push(nested.node);
        i = nested.next;
      } else {
        if (children.length) break;
        text.push(lines[i].text);
        i++;
      }
    }
    const head = paragraph(text);
    items.push({ type: "listItem", content: [head ?? { type: "paragraph" }, ...children] });
  }
  const node: RichTextNode = { type: ordered ? "orderedList" : "bulletList", content: items };
  if (ordered && Number(first[2]) !== 1) node.attrs = { start: Number(first[2]) };
  return { node, next: i };
}

export function markdownToRichText(markdown: string | null | undefined): RichText | null {
  const source = (markdown ?? "").replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const blocks: RichTextNode[] = [];
  for (const chunk of source.split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => ({ indent: line.length - line.trimStart().length, text: line.trim() }));
    let i = 0;
    while (i < lines.length) {
      if (LIST_ITEM.test(lines[i].text)) {
        const list = parseList(lines, i);
        blocks.push(list.node);
        i = list.next;
        continue;
      }
      const text: string[] = [];
      while (i < lines.length && !LIST_ITEM.test(lines[i].text)) text.push(lines[i++].text);
      const node = paragraph(text);
      if (node) blocks.push(node);
    }
  }
  return blocks.length ? { type: "doc", content: blocks } : null;
}

/** Plain text of a rich text value, for short summaries. */
export function richTextToPlain(doc: RichText | null | undefined): string {
  const walk = (node: RichTextNode): string =>
    node.type === "text" ? (node.text ?? "") : node.type === "hardBreak" ? " " : (node.content ?? []).map(walk).join(" ");
  return doc ? walk(doc).replace(/\s+/g, " ").trim() : "";
}
