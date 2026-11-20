import type { CSSProperties } from "react";
import { contactIcon, resolveContact } from "@/lib/documents/contacts";
import { isIconStyle, type DocumentDesign, type LinkDisplay, type PersonalDetails } from "@/lib/documents/schema";
import { cn } from "@/lib/utils";
import { ContactIconMark } from "./contact-icons";

export function DocumentHeader({
  personal,
  design,
  linkDisplays,
}: {
  personal: PersonalDetails;
  design: Pick<
    DocumentDesign,
    "headerDivider" | "contactStyle" | "contactIconColor" | "underlineContactLinks" | "linkDisplay"
  >;
  /** Per-contact overrides of `design.linkDisplay`. */
  linkDisplays?: Record<string, LinkDisplay>;
}) {
  const contacts = personal.contacts.flatMap((contact) => {
    const resolved = resolveContact(contact, linkDisplays?.[contact.id] ?? design.linkDisplay);
    return resolved ? [{ ...resolved, id: contact.id, icon: contactIcon(contact) }] : [];
  });

  if (!personal.name && contacts.length === 0) return null;

  const iconStyle = isIconStyle(design.contactStyle) ? design.contactStyle : null;
  const iconColor = design.contactIconColor === "accent" ? "var(--doc-accent)" : "#333";

  return (
    <header className={cn("doc-header", design.headerDivider && "doc-header--divider")}>
      {personal.name && <h1 className="doc-name">{personal.name}</h1>}
      {contacts.length > 0 && (
        <p
          className={cn("doc-contacts", iconStyle && "doc-contacts--icons")}
          data-icon-variant={iconStyle ?? undefined}
          data-separator={iconStyle ? undefined : design.contactStyle}
          data-underline-links={design.underlineContactLinks || undefined}
          style={{ "--doc-icon-color": iconColor } as CSSProperties}
        >
          {contacts.map(({ id, label, href, icon }) => (
            <span key={id} className="doc-contact">
              {iconStyle && <ContactIconMark icon={icon} variant={iconStyle} />}
              {href ? <a href={href}>{label}</a> : label}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}
