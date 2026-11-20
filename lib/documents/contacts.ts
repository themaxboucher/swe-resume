import { displayUrl, hrefFor } from "./format";
import type { ContactField, ContactIcon, ContactType, LinkDisplay } from "./schema";
import { newId } from "./sections";

type ContactMeta = {
  label: string;
  /** Default icon. */
  icon: ContactIcon;
  /** Icon variants offered first in the picker. */
  iconChoices: ContactIcon[];
  /** Example text for the display input. */
  placeholder: string;
  /**
   * "auto" links from the value (mailto:, tel:) unless turned off, "always" asks for a URL,
   * "optional" lets the user add one.
   */
  link: "none" | "auto" | "always" | "optional";
  urlPlaceholder?: string;
};

export const CONTACT_META: Record<ContactType, ContactMeta> = {
  email: {
    label: "Email",
    icon: "mail",
    iconChoices: ["mail", "at-sign"],
    placeholder: "ada@example.com",
    link: "auto",
  },
  phone: {
    label: "Phone",
    icon: "phone",
    iconChoices: ["phone", "smartphone"],
    placeholder: "+1 555 123 4567",
    link: "auto",
  },
  location: {
    label: "Location",
    icon: "map-pin",
    iconChoices: ["map-pin", "house", "globe"],
    placeholder: "Calgary, AB",
    link: "none",
  },
  website: {
    label: "Website",
    icon: "link",
    iconChoices: ["link", "globe"],
    placeholder: "ada.dev",
    link: "always",
    urlPlaceholder: "https://ada.dev",
  },
  linkedin: {
    label: "LinkedIn",
    icon: "linkedin",
    iconChoices: ["linkedin", "linkedin-box"],
    placeholder: "LinkedIn",
    link: "always",
    urlPlaceholder: "linkedin.com/in/username",
  },
  github: {
    label: "GitHub",
    icon: "github",
    iconChoices: ["github", "code"],
    placeholder: "GitHub",
    link: "always",
    urlPlaceholder: "github.com/username",
  },
  custom: {
    label: "Custom field",
    icon: "link",
    iconChoices: [],
    placeholder: "Portfolio, Open to relocation…",
    link: "optional",
    urlPlaceholder: "https://…",
  },
};

export function contactIcon(contact: Pick<ContactField, "type" | "icon">): ContactIcon {
  return contact.icon ?? CONTACT_META[contact.type].icon;
}

export function newContact(type: ContactType, value = ""): ContactField {
  return { id: newId(), type, value, url: "" };
}

/**
 * What a contact shows on the document, or null when it has nothing to show. With `display: "url"`,
 * linked contacts spell out their URL (for print) instead of their text.
 */
export function resolveContact(
  contact: ContactField,
  display: LinkDisplay = "label",
): { label: string; href?: string } | null {
  const value = contact.value.trim();
  const url = contact.url.trim();
  switch (CONTACT_META[contact.type].link) {
    case "none":
      return value ? { label: value } : null;
    case "auto":
      if (!value) return null;
      if (contact.linked === false) return { label: value };
      return contact.type === "email"
        ? { label: value, href: `mailto:${value}` }
        : { label: value, href: `tel:${value.replace(/[^\d+]/g, "")}` };
    default: {
      const label = display === "url" && url ? displayUrl(url) : value || (url ? displayUrl(url) : "");
      if (!label) return null;
      return { label, href: url ? hrefFor(url) : undefined };
    }
  }
}

/** Whether a contact's link display (label vs spelled-out URL) makes a difference. */
export function hasLinkChoice(contact: ContactField) {
  const { link } = CONTACT_META[contact.type];
  return link === "always" || (link === "optional" && contact.url.trim() !== "");
}
