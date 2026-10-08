export const SUPPORT_EMAIL = "support@lobyas.com";
/** The address Lobyas emails (invites and notices) come from. */
export const SENDER_EMAIL = "team@lobyas.com";
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;

const CONTACT_PATH = "/contact";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";

export const LEGAL_LINKS = [
  { href: PRIVACY_PATH, label: "Privacy Policy" },
  { href: TERMS_PATH, label: "Terms" },
  { href: CONTACT_PATH, label: "Contact" },
] as const;
