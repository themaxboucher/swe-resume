"use client";

import {
  AlignCenterIcon,
  AlignLeftIcon,
  CheckIcon,
  ColumnsIcon,
  MousePointerClickIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PrinterIcon,
  SquareIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { ContactIconMark } from "@/components/document/contact-icons";
import { DOCUMENT_FONTS } from "@/components/document/document-fonts";
import { Switch } from "@/components/ui/switch";
import { FONT_OPTIONS } from "@/lib/documents/fonts";
import {
  CONTACT_ICON_STYLES,
  DATE_FORMATS,
  isIconStyle,
  SUBTITLE_PLACEMENTS,
  type SubtitleStyle,
  type ContactStyle,
  type DocumentDesign,
  type Section,
} from "@/lib/documents/schema";
import { SECTION_LABELS, defaultColumnFor } from "@/lib/documents/sections";
import { cn } from "@/lib/utils";
import { StepSlider } from "./step-slider";
import { Segmented } from "./fields";

const ACCENT_PRESETS = [
  "#0084d1",
  "#1f1f1f",
  "#2563eb",
  "#0e7490",
  "#0f766e",
  "#15803d",
  "#a16207",
  "#c2410c",
  "#be123c",
  "#9333ea",
  "#475569",
];

/** Darkest to lightest; the first matches the body text. */
const MUTED_TEXT_PRESETS = ["#1f1f1f", "#333333", "#555555", "#777777", "#999999"];

const DATE_FORMAT_EXAMPLES: Record<(typeof DATE_FORMATS)[number], string> = {
  "MM/YYYY": "03/2024",
  "MMM YYYY": "Mar 2024",
  "MMMM YYYY": "March 2024",
  YYYY: "2024",
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-4 shadow-panel">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Row({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        {value !== undefined && <span className="font-medium tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  );
}

/** Sizes stored as offsets from the base font size, e.g. "+12 pt" or "−2 pt". */
function formatOffset(value: number) {
  return `${value < 0 ? "−" : "+"}${Math.abs(value)} pt`;
}

const RangeRow = StepSlider;

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {description && <span className="text-xs text-muted-foreground/80">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={(next) => onChange(next)} />
    </label>
  );
}

function ColorSwatches({
  name,
  presets,
  value,
  onChange,
}: {
  name: string;
  presets: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  const current = value.toLowerCase();
  return (
    <div className="flex flex-wrap gap-2">
      {presets.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`${name} ${color}`}
          aria-pressed={current === color}
          onClick={() => onChange(color)}
          className="flex size-8 items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
          style={{ background: color }}
        >
          {current === color && <CheckIcon className="size-4 text-white" />}
        </button>
      ))}
      <label
        className="relative flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-1 ring-black/10"
        style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
        title="Custom color"
      >
        <input
          type="color"
          aria-label={`Custom ${name.toLowerCase()} color`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

const CONTACT_STYLE_LABELS: Record<ContactStyle, string> = {
  dot: "Dot separator",
  line: "Line separator",
  plain: "Outline icons",
  filled: "Filled icons",
  circle: "Icons in filled circles",
  rounded: "Icons in filled rounded squares",
  square: "Icons in filled squares",
  "circle-outline": "Icons in outlined circles",
  "rounded-outline": "Icons in outlined rounded squares",
  "square-outline": "Icons in outlined squares",
};

function StyleTile({
  style,
  selected,
  onSelect,
  children,
}: {
  style: ContactStyle;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={CONTACT_STYLE_LABELS[style]}
      title={CONTACT_STYLE_LABELS[style]}
      onClick={onSelect}
      className={cn(
        "flex h-11 items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] text-neutral-500 ring-1 ring-border transition-all hover:ring-foreground/30",
        selected && "ring-2 ring-primary hover:ring-primary",
      )}
    >
      {children}
    </button>
  );
}

function ContactStylePicker({
  value,
  color,
  onChange,
}: {
  value: ContactStyle;
  color: string;
  onChange: (value: ContactStyle) => void;
}) {
  const sample = <span className="h-1.5 w-4 rounded-full bg-neutral-300" />;
  return (
    <div role="radiogroup" aria-label="Contact details style" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">Separator</span>
        <div className="grid grid-cols-2 gap-1.5">
          <StyleTile style="dot" selected={value === "dot"} onSelect={() => onChange("dot")}>
            {sample}
            <span className="text-base leading-none font-bold text-neutral-400">·</span>
            {sample}
          </StyleTile>
          <StyleTile style="line" selected={value === "line"} onSelect={() => onChange("line")}>
            {sample}
            <span className="mx-0.5 h-3.5 w-px bg-neutral-400" />
            {sample}
          </StyleTile>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">Icons</span>
        <div className="grid grid-cols-4 gap-1.5">
          {CONTACT_ICON_STYLES.map((style) => (
            <StyleTile key={style} style={style} selected={value === style} onSelect={() => onChange(style)}>
              <ContactIconMark icon="link" variant={style} color={color} />
            </StyleTile>
          ))}
        </div>
      </div>
    </div>
  );
}

type SubtitlePlacement = SubtitleStyle["placement"];

const PLACEMENT_LABELS: Record<SubtitlePlacement, string> = {
  below: "Separate lines",
  comma: "Same line, separated by a comma",
  bar: "Same line, separated by a vertical line",
};

/** Placement, order and styling for one kind of entry subtitle (employer or school). */
function SubtitleStyleGroup({
  title,
  description,
  titleNoun,
  subtitleNoun,
  value,
  onChange,
  linkOption = false,
}: {
  title: string;
  description?: string;
  titleNoun: string;
  subtitleNoun: string;
  value: SubtitleStyle;
  onChange: (recipe: (style: SubtitleStyle) => void) => void;
  /** Show the "Underline links" option (employers can be links; schools can't). */
  linkOption?: boolean;
}) {
  const subtitleFirst = value.order === "subtitle-first";
  const titleSample = <span className="font-semibold">{titleNoun}</span>;
  const subtitleSample = <span className={cn("text-neutral-500", value.italic && "italic")}>{subtitleNoun}</span>;
  const [first, second] = subtitleFirst ? [subtitleSample, titleSample] : [titleSample, subtitleSample];
  const lower = subtitleNoun.toLowerCase();

  return (
    <Group title={title}>
      {description && <p className="-mt-3 text-xs text-muted-foreground">{description}</p>}
      <Row label="Order">
        <Segmented
          ariaLabel={`${title} order`}
          value={value.order}
          onChange={(v) => onChange((s) => void (s.order = v))}
          options={[
            { value: "title-first", label: `${titleNoun} first` },
            { value: "subtitle-first", label: `${subtitleNoun} first` },
          ]}
        />
      </Row>
      <Row label="Placement">
        <div role="radiogroup" aria-label={`${title} placement`} className="grid grid-cols-3 gap-1.5">
          {SUBTITLE_PLACEMENTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={value.placement === option}
              aria-label={PLACEMENT_LABELS[option]}
              title={PLACEMENT_LABELS[option]}
              onClick={() => onChange((s) => void (s.placement = option))}
              className={cn(
                "flex h-14 min-w-0 flex-col items-start justify-center overflow-hidden rounded-lg bg-white px-2 text-left text-[10.5px] leading-tight text-neutral-900 ring-1 ring-border transition-all hover:ring-foreground/30",
                value.placement === option && "ring-2 ring-primary hover:ring-primary",
              )}
            >
              {option === "below" ? (
                <>
                  {first}
                  {second}
                </>
              ) : (
                <span className="flex items-center whitespace-nowrap">
                  {first}
                  {option === "comma" ? <span>,&nbsp;</span> : <span className="mx-1 h-2.5 w-px shrink-0 bg-neutral-400" />}
                  {second}
                </span>
              )}
            </button>
          ))}
        </div>
      </Row>
      <ToggleRow
        label="Italic"
        description={`Show the ${lower} in italics`}
        checked={value.italic}
        onChange={(v) => onChange((s) => void (s.italic = v))}
      />
      {linkOption && (
        <ToggleRow
          label="Underline links"
          description={`Underline the ${lower} when it has a link`}
          checked={value.underlineLinks}
          onChange={(v) => onChange((s) => void (s.underlineLinks = v))}
        />
      )}
    </Group>
  );
}

export function DesignPanel({
  design,
  updateDesign,
  sections,
  header,
}: {
  design: DocumentDesign;
  updateDesign: (recipe: (draft: DocumentDesign) => void) => void;
  /** Resume sections in display order, for the column placement list. Omitted for cover letters. */
  sections?: Section[];
  /** Shown above the settings, e.g. which version they apply to. */
  header?: ReactNode;
}) {
  const set = <K extends keyof DocumentDesign>(key: K, value: DocumentDesign[K]) =>
    updateDesign((d) => {
      d[key] = value;
    });

  return (
    <div className="flex flex-col gap-3">
      {header}
      {sections && (
        <Group title="Layout">
          <Row label="Columns">
            <Segmented
              ariaLabel="Columns"
              value={design.columns}
              onChange={(v) => set("columns", v)}
              options={[
                { value: 1, label: <><SquareIcon /> One column</> },
                { value: 2, label: <><ColumnsIcon /> Two columns</> },
              ]}
            />
          </Row>
          {design.columns === 2 && (
            <>
              <Row label="Sidebar position">
                <Segmented
                  ariaLabel="Sidebar position"
                  value={design.sidebarSide}
                  onChange={(v) => set("sidebarSide", v)}
                  options={[
                    { value: "left", label: <><PanelLeftIcon /> Left</> },
                    { value: "right", label: <><PanelRightIcon /> Right</> },
                  ]}
                />
              </Row>
              <RangeRow
                label="Sidebar width"
                value={design.sidebarWidth}
                min={25}
                max={45}
                step={1}
                format={(v) => `${v}%`}
                onChange={(v) => set("sidebarWidth", v)}
              />
              <Row label="Section placement">
                <ul className="flex flex-col divide-y divide-border rounded-lg ring-1 ring-border">
                  {sections.map((section) => {
                    const column = design.sectionColumns[section.id] ?? defaultColumnFor(section.type);
                    return (
                      <li key={section.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="truncate text-sm">{section.title || SECTION_LABELS[section.type]}</span>
                        <div className="w-40 shrink-0">
                          <Segmented
                            ariaLabel={`Column for ${section.title}`}
                            value={column}
                            onChange={(v) =>
                              updateDesign((d) => {
                                d.sectionColumns[section.id] = v;
                              })
                            }
                            options={[
                              { value: "main", label: "Main" },
                              { value: "sidebar", label: "Sidebar" },
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Order within each column follows the Content tab. Hidden sections aren&apos;t listed.
                </p>
              </Row>
            </>
          )}
        </Group>
      )}

      <Group title="Header">
        <Row label="Alignment">
          <Segmented
            ariaLabel="Header alignment"
            value={design.headerAlign}
            onChange={(v) => set("headerAlign", v)}
            options={[
              { value: "left", label: <><AlignLeftIcon /> Left</> },
              { value: "center", label: <><AlignCenterIcon /> Center</> },
            ]}
          />
        </Row>
        <ToggleRow
          label="Divider line"
          description="Rule under your name and contact details"
          checked={design.headerDivider}
          onChange={(v) => set("headerDivider", v)}
        />
        <Row label="Contact details">
          <ContactStylePicker
            value={design.contactStyle}
            color={design.contactIconColor === "accent" ? design.accentColor : "#333"}
            onChange={(v) => set("contactStyle", v)}
          />
        </Row>
        <Row label="Show links as">
          <Segmented
            ariaLabel="Show links as"
            value={design.linkDisplay}
            onChange={(v) => set("linkDisplay", v)}
            options={[
              { value: "label", label: <><MousePointerClickIcon /> Labels</>, title: "“LinkedIn”, clickable in the PDF" },
              { value: "url", label: <><PrinterIcon /> Full URLs</>, title: "“linkedin.com/in/you”, readable on paper" },
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {design.linkDisplay === "url"
              ? sections
                ? "Contacts and linked projects spell out their address, for printed copies."
                : "Contacts spell out their address, for printed copies."
              : "Linked contacts show their text, like “LinkedIn”. Best for PDFs sent by email."}
          </p>
        </Row>
        <ToggleRow
          label="Underline links"
          description="Underline contact details that are clickable"
          checked={design.underlineContactLinks}
          onChange={(v) => set("underlineContactLinks", v)}
        />
        {isIconStyle(design.contactStyle) && (
          <Row label="Icon color">
            <Segmented
              ariaLabel="Icon color"
              value={design.contactIconColor}
              onChange={(v) => set("contactIconColor", v)}
              options={[
                { value: "text", label: "Text" },
                { value: "accent", label: "Accent" },
              ]}
            />
          </Row>
        )}
      </Group>

      {sections && (
        <>
          <SubtitleStyleGroup
            title="School"
            description="Education entries."
            titleNoun="Degree"
            subtitleNoun="School"
            value={design.schoolStyle}
            onChange={(recipe) => updateDesign((d) => recipe(d.schoolStyle))}
          />
          <SubtitleStyleGroup
            title="Employer"
            description="Experience entries. Certifications and custom sections follow this too."
            titleNoun="Job title"
            subtitleNoun="Employer"
            value={design.employerStyle}
            onChange={(recipe) => updateDesign((d) => recipe(d.employerStyle))}
            linkOption
          />
          <Group title="Projects">
            <ToggleRow
              label="Underline links"
              description="Underline the project name when it has a link"
              checked={design.underlineProjectLinks}
              onChange={(v) => set("underlineProjectLinks", v)}
            />
          </Group>
        </>
      )}

      <Group title="Colors">
        <Row label="Accent">
          <ColorSwatches
            name="Accent"
            presets={ACCENT_PRESETS}
            value={design.accentColor}
            onChange={(v) => set("accentColor", v)}
          />
        </Row>
        <Row label="Secondary text" value={<span className="text-muted-foreground">Contacts, dates, locations</span>}>
          <ColorSwatches
            name="Secondary text"
            presets={MUTED_TEXT_PRESETS}
            value={design.mutedTextColor}
            onChange={(v) => set("mutedTextColor", v)}
          />
        </Row>
      </Group>

      <Group title="Typography">
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font.id}
              type="button"
              aria-pressed={design.fontFamily === font.id}
              onClick={() => set("fontFamily", font.id)}
              className={cn(
                "flex flex-col items-start rounded-lg px-3 py-2 text-left ring-1 ring-border transition-all hover:ring-foreground/30",
                design.fontFamily === font.id && "bg-accent ring-2 ring-primary hover:ring-primary",
              )}
            >
              <span className="text-[15px] leading-tight" style={{ fontFamily: DOCUMENT_FONTS[font.id] }}>
                {font.label}
              </span>
              <span className="text-[11px] text-muted-foreground">{font.kind}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Font size">
        <RangeRow
          label="Base font size"
          value={design.fontSize}
          min={8}
          max={13}
          step={0.5}
          format={(v) => `${v} pt`}
          onChange={(v) => set("fontSize", v)}
        />
        <RangeRow
          label="Full name"
          value={design.nameSize}
          min={4}
          max={18}
          step={1}
          format={formatOffset}
          onChange={(v) => set("nameSize", v)}
        />
        {sections && (
          <>
            <RangeRow
              label="Section headings"
              value={design.headingSize}
              min={-3}
              max={4}
              step={0.5}
              format={formatOffset}
              onChange={(v) => set("headingSize", v)}
            />
            <RangeRow
              label="Section heading letter spacing"
              value={design.headingLetterSpacing}
              min={0}
              max={0.3}
              step={0.01}
              format={(v) => `${v.toFixed(2)} em`}
              onChange={(v) => set("headingLetterSpacing", v)}
            />
            <RangeRow
              label="Entry header"
              value={design.entryTitleSize}
              min={-1}
              max={4}
              step={0.5}
              format={formatOffset}
              onChange={(v) => set("entryTitleSize", v)}
            />
          </>
        )}
      </Group>

      <Group title="Spacing">
        <RangeRow
          label="Line height"
          value={design.lineHeight}
          min={1.1}
          max={1.8}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => set("lineHeight", Math.round(v * 100) / 100)}
        />
        <RangeRow
          label={sections ? "Space between sections" : "Space between blocks"}
          value={design.sectionSpacing}
          min={4}
          max={36}
          step={1}
          format={(v) => `${v} px`}
          onChange={(v) => set("sectionSpacing", v)}
        />
        {sections && (
          <RangeRow
            label="Space between entries"
            value={design.entrySpacing}
            min={0}
            max={24}
            step={1}
            format={(v) => `${v} px`}
            onChange={(v) => set("entrySpacing", v)}
          />
        )}
        <RangeRow
          label="Left & right margins"
          value={design.marginX}
          min={8}
          max={30}
          step={1}
          format={(v) => `${v} mm`}
          onChange={(v) => set("marginX", v)}
        />
        <RangeRow
          label="Top & bottom margins"
          value={design.marginY}
          min={8}
          max={30}
          step={1}
          format={(v) => `${v} mm`}
          onChange={(v) => set("marginY", v)}
        />
      </Group>

      <Group title="Page">
        <Row label="Paper size">
          <Segmented
            ariaLabel="Paper size"
            value={design.pageSize}
            onChange={(v) => set("pageSize", v)}
            options={[
              { value: "A4", label: "A4", title: "210 × 297 mm" },
              { value: "LETTER", label: "US Letter", title: "8.5 × 11 in" },
            ]}
          />
        </Row>
        {sections && (
          <Row label="Date format">
            <div className="grid grid-cols-2 gap-1.5">
              {DATE_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={design.dateFormat === format}
                  onClick={() => set("dateFormat", format)}
                  className={cn(
                    "h-8 rounded-md text-xs font-medium ring-1 ring-border transition-all hover:ring-foreground/30",
                    design.dateFormat === format && "bg-accent text-primary ring-2 ring-primary hover:ring-primary",
                  )}
                >
                  {DATE_FORMAT_EXAMPLES[format]}
                </button>
              ))}
            </div>
          </Row>
        )}
      </Group>
    </div>
  );
}
