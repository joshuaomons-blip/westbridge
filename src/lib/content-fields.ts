/**
 * Registry of editable website content. Empty fields fall back to the
 * default text in the translation files, so the site always has content.
 */
export type ContentFieldType = "text" | "textarea" | "image" | "toggle" | "email" | "phone";

export type ContentField = {
  key: string;
  label: string;
  group: "Homepage" | "Company" | "Contact details" | "Footer & support" | "Legal pages" | "Page sections";
  type: ContentFieldType;
  /** true = one value per language; false = one shared value for all languages */
  localized: boolean;
  help?: string;
};

export const CONTENT_FIELDS: ContentField[] = [
  { key: "home.hero_title", label: "Homepage headline", group: "Homepage", type: "text", localized: true },
  { key: "home.hero_subtitle", label: "Homepage supporting text", group: "Homepage", type: "textarea", localized: true },
  { key: "home.hero_image", label: "Homepage hero image", group: "Homepage", type: "image", localized: false,
    help: "Upload a high-quality photo of your own vehicles, staff or facilities (JPG, PNG, WebP or AVIF, max 5 MB)." },

  { key: "about.title", label: "About page heading", group: "Company", type: "text", localized: true },
  { key: "about.body", label: "Company description", group: "Company", type: "textarea", localized: true,
    help: "Only include verified facts about the company. Separate paragraphs with a blank line." },

  { key: "contact.phone", label: "Phone number", group: "Contact details", type: "phone", localized: false },
  { key: "contact.email", label: "Email address", group: "Contact details", type: "email", localized: false },
  { key: "contact.address", label: "Postal address", group: "Contact details", type: "textarea", localized: false },
  { key: "contact.hours", label: "Opening hours", group: "Contact details", type: "text", localized: true },

  { key: "footer.text", label: "Footer description", group: "Footer & support", type: "textarea", localized: true },
  { key: "support.text", label: "Customer support information", group: "Footer & support", type: "textarea", localized: true },

  { key: "privacy.body", label: "Privacy policy", group: "Legal pages", type: "textarea", localized: true,
    help: "Have this reviewed for the countries you operate in before launch." },
  { key: "terms.body", label: "Terms of service", group: "Legal pages", type: "textarea", localized: true,
    help: "Have this reviewed for the countries you operate in before launch." },

  { key: "section.services.visible", label: "Show services on homepage", group: "Page sections", type: "toggle", localized: false },
  { key: "section.how_it_works.visible", label: "Show “How it works” on homepage", group: "Page sections", type: "toggle", localized: false },
  { key: "section.support.visible", label: "Show customer support section on homepage", group: "Page sections", type: "toggle", localized: false },
];

export const CONTENT_FIELD_MAP = new Map(CONTENT_FIELDS.map((f) => [f.key, f]));
