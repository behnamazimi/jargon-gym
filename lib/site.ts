const SUPPORT_EMAIL = "support@lobyas.com";
const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

const PRIVACY_PATH = "/privacy";
const TERMS_PATH = "/terms";

export const LEGAL_LINKS = [
  { href: PRIVACY_PATH, label: "Privacy" },
  { href: TERMS_PATH, label: "Terms" },
  { href: SUPPORT_MAILTO, label: "Contact" },
] as const;
