import {
  AtSignIcon,
  AwardIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  CameraIcon,
  CodeIcon,
  FileTextIcon,
  GlobeIcon,
  GraduationCapIcon,
  HouseIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PenToolIcon,
  PhoneIcon,
  SmartphoneIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import type { ContactIcon, ContactIconStyle } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import "./document.css";

type IconProps = { className?: string; strokeWidth?: number; "aria-hidden"?: boolean };

// Lucide no longer ships brand icons, so these two are drawn here (Simple Icons paths).
function LinkedInIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={rest["aria-hidden"]}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

/** The full LinkedIn logo: a solid rounded square with the "in" cut out. */
function LinkedInBoxIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" className={className} aria-hidden={rest["aria-hidden"]}>
      <path d="M3.5 1h17A2.5 2.5 0 0 1 23 3.5v17a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 1 20.5v-17A2.5 2.5 0 0 1 3.5 1zM18.6 18.6h-2.85v-4.46c0-1.06-.02-2.43-1.48-2.43-1.48 0-1.71 1.16-1.71 2.35v4.54H9.71V9.44h2.73v1.25h.04c.38-.72 1.31-1.48 2.7-1.48 2.88 0 3.42 1.9 3.42 4.37v5.02zM6.54 8.19a1.65 1.65 0 1 1 0-3.3 1.65 1.65 0 0 1 0 3.3zM7.96 18.6H5.11V9.44h2.85v9.16z" />
    </svg>
  );
}

function GitHubIcon({ className, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden={rest["aria-hidden"]}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

export const CONTACT_ICON_COMPONENTS: Record<ContactIcon, ComponentType<IconProps>> = {
  link: LinkIcon,
  globe: GlobeIcon,
  mail: MailIcon,
  phone: PhoneIcon,
  smartphone: SmartphoneIcon,
  "map-pin": MapPinIcon,
  house: HouseIcon,
  "at-sign": AtSignIcon,
  linkedin: LinkedInIcon,
  "linkedin-box": LinkedInBoxIcon,
  github: GitHubIcon,
  code: CodeIcon,
  briefcase: BriefcaseIcon,
  "graduation-cap": GraduationCapIcon,
  "book-open": BookOpenIcon,
  "pen-tool": PenToolIcon,
  award: AwardIcon,
  calendar: CalendarIcon,
  user: UserIcon,
  "message-circle": MessageCircleIcon,
  "file-text": FileTextIcon,
  camera: CameraIcon,
  star: StarIcon,
};

export const CONTACT_ICON_LABELS: Record<ContactIcon, string> = {
  link: "Link",
  globe: "Globe",
  mail: "Mail",
  phone: "Phone",
  smartphone: "Mobile",
  "map-pin": "Location",
  house: "Home",
  "at-sign": "At sign",
  linkedin: "LinkedIn",
  "linkedin-box": "LinkedIn logo",
  github: "GitHub",
  code: "Code",
  briefcase: "Work",
  "graduation-cap": "Education",
  "book-open": "Publication",
  "pen-tool": "Design",
  award: "Award",
  calendar: "Calendar",
  user: "Person",
  "message-circle": "Chat",
  "file-text": "Document",
  camera: "Photo",
  star: "Star",
};

// ---------- Filled glyphs ----------
// Lucide's shapes drawn solid. Interior details are knocked out in white, which works because the
// filled style sits directly on the white page (never inside a coloured badge).

type SvgNode = ["path", { d: string }] | ["circle", { cx: number; cy: number; r: number }] | ["rect", { x: number; y: number; width: number; height: number; rx: number }];

type FilledSpec = {
  /** Solid shapes. */
  body?: SvgNode[];
  /** Strokes in the icon colour (parts that read as lines even when filled). */
  line?: SvgNode[];
  /** White knock-out strokes drawn over the body. */
  detail?: SvgNode[];
  /** Stroke width for `line`; outline-only icons get a heavier stroke instead of a fill. */
  lineWidth?: number;
};

const FILLED: Partial<Record<ContactIcon, FilledSpec>> = {
  link: {
    line: [
      ["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }],
      ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }],
    ],
    lineWidth: 3,
  },
  globe: {
    body: [["circle", { cx: 12, cy: 12, r: 10 }]],
    detail: [["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" }], ["path", { d: "M2 12h20" }]],
  },
  mail: {
    body: [["rect", { x: 2, y: 4, width: 20, height: 16, rx: 2 }]],
    detail: [["path", { d: "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }]],
  },
  phone: {
    body: [
      ["path", { d: "M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" }],
    ],
  },
  smartphone: {
    body: [["rect", { x: 5, y: 2, width: 14, height: 20, rx: 2 }]],
    detail: [["path", { d: "M11 18h2" }]],
  },
  house: {
    body: [["path", { d: "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }]],
    detail: [["path", { d: "M15 21v-7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v7" }]],
  },
  "map-pin": {
    body: [["path", { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }]],
    detail: [["circle", { cx: 12, cy: 10, r: 2 }]],
  },
  "at-sign": {
    line: [["circle", { cx: 12, cy: 12, r: 4 }], ["path", { d: "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" }]],
    lineWidth: 2.75,
  },
  code: {
    line: [["path", { d: "m16 18 6-6-6-6" }], ["path", { d: "m8 6-6 6 6 6" }]],
    lineWidth: 3,
  },
  briefcase: {
    line: [["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }]],
    body: [["rect", { x: 2, y: 6, width: 20, height: 14, rx: 2 }]],
    detail: [["path", { d: "M2 12.5h20" }]],
  },
  "graduation-cap": {
    body: [
      ["path", { d: "M6 12.5V16a6 3 0 0 0 12 0v-3.5" }],
      ["path", { d: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" }],
    ],
    line: [["path", { d: "M22 10v6" }]],
    detail: [["path", { d: "M6.5 13.5 12 16l5.5-2.5" }]],
  },
  "book-open": {
    body: [
      ["path", { d: "M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z" }],
    ],
    detail: [["path", { d: "M12 6v13" }]],
  },
  "pen-tool": {
    body: [
      ["path", { d: "m18 13-.654-4.736a4 4 0 0 0-2.756-3.266l-9.163-2.9a2 2 0 0 0-2.017.493l-.82.819a2 2 0 0 0-.492 2.017l2.9 9.163a4 4 0 0 0 3.266 2.756L13 18" }],
      ["path", { d: "M18.648 12.352a1.205 1.205 0 0 1 1.704 0l1.296 1.296a1.205 1.205 0 0 1 0 1.704l-6.296 6.296a1.205 1.205 0 0 1-1.704 0l-1.296-1.296a1.205 1.205 0 0 1 0-1.704z" }],
    ],
    detail: [["path", { d: "m4 4 5.586 5.586" }], ["circle", { cx: 11, cy: 11, r: 1.5 }]],
  },
  award: {
    body: [
      ["path", { d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" }],
      ["circle", { cx: 12, cy: 8, r: 6 }],
    ],
    detail: [["circle", { cx: 12, cy: 8, r: 2.5 }]],
  },
  calendar: {
    line: [["path", { d: "M8 2v3" }], ["path", { d: "M16 2v3" }]],
    body: [["rect", { x: 3, y: 4, width: 18, height: 17, rx: 2 }]],
    detail: [["path", { d: "M3 10h18" }]],
  },
  user: {
    body: [["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2z" }], ["circle", { cx: 12, cy: 7, r: 4 }]],
  },
  "message-circle": {
    body: [
      ["path", { d: "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" }],
    ],
  },
  "file-text": {
    body: [["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }]],
    detail: [["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }], ["path", { d: "M16 13H8" }], ["path", { d: "M16 17H8" }]],
  },
  camera: {
    body: [
      ["path", { d: "M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z" }],
    ],
    detail: [["circle", { cx: 12, cy: 13, r: 3 }]],
  },
  star: {
    body: [
      ["path", { d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" }],
    ],
  },
};

function renderNodes(nodes: SvgNode[] | undefined, prefix: string) {
  return nodes?.map(([tag, attrs], i) => {
    const Tag = tag;
    return <Tag key={`${prefix}${i}`} {...(attrs as Record<string, unknown>)} />;
  });
}

function FilledIcon({ icon }: { icon: ContactIcon }) {
  const spec = FILLED[icon];
  // Brand logos are already solid.
  if (!spec) {
    const Icon = CONTACT_ICON_COMPONENTS[icon];
    return <Icon />;
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g fill="currentColor" stroke="currentColor" strokeWidth={2}>
        {renderNodes(spec.body, "b")}
      </g>
      <g stroke="currentColor" strokeWidth={spec.lineWidth ?? 2}>
        {renderNodes(spec.line, "l")}
      </g>
      <g stroke="#fff" strokeWidth={2}>
        {renderNodes(spec.detail, "d")}
      </g>
    </svg>
  );
}

/** A contact icon drawn in one of the document's icon styles. Styled by document.css. */
export function ContactIconMark({
  icon,
  variant,
  color,
  className,
}: {
  icon: ContactIcon;
  variant: ContactIconStyle;
  /** Overrides --doc-icon-color, e.g. for previews outside a document. */
  color?: string;
  className?: string;
}) {
  const Icon = CONTACT_ICON_COMPONENTS[icon];
  return (
    <span
      aria-hidden
      className={cn("doc-contact-icon", className)}
      data-variant={variant}
      style={color ? ({ "--doc-icon-color": color } as CSSProperties) : undefined}
    >
      {variant === "filled" ? <FilledIcon icon={icon} /> : <Icon strokeWidth={2.25} />}
    </span>
  );
}
