export const CONSENT_COOKIE = "lb_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export type Consent = "granted" | "denied";

/** Which wording of the banner a choice was made under. If the wording changes materially, bump this and rename the cookie so everyone is asked again. */
export const CONSENT_VERSION = "v1";

export function parseConsent(raw: string | null | undefined): Consent | null {
  return raw === "granted" || raw === "denied" ? raw : null;
}

/** Reads the consent choice out of a `Cookie` header or `document.cookie`. */
export function consentFromCookieHeader(header: string | null | undefined): Consent | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(value.join("="));
  }
  return null;
}

export function serializeConsentCookie(consent: Consent, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${consent}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export type SavedConsent = { choice: Consent; at: string | null; version: string | null };

export type ConsentSync = {
  /** The choice this device should follow. */
  effective: Consent | null;
  /** Set the cookie to this, when it differs from what the device has. */
  setCookie: Consent | null;
  /** Record this choice on the account. */
  saveToAccount: Consent | null;
};

/** A saved choice counts only while it is as fresh as the cookie would be and was made under the current wording. */
export function currentSavedChoice(saved: SavedConsent | null, now = new Date()): Consent | null {
  if (!saved || saved.version !== CONSENT_VERSION || !saved.at) return null;
  const age = now.getTime() - new Date(saved.at).getTime();
  return age >= 0 && age < CONSENT_MAX_AGE_SECONDS * 1000 ? saved.choice : null;
}

/** Reconciles this device's cookie with the choice saved on the account.
 *  A refusal always wins, so analytics never starts against one, and it is
 *  written back to the account so a later device can't inherit an old yes. */
export function syncConsent(cookie: Consent | null, saved: Consent | null): ConsentSync {
  if (cookie === saved) return { effective: cookie, setCookie: null, saveToAccount: null };
  if (cookie === null) return { effective: saved, setCookie: saved, saveToAccount: null };
  if (saved === null) return { effective: cookie, setCookie: null, saveToAccount: cookie };
  return {
    effective: "denied",
    setCookie: cookie === "denied" ? null : "denied",
    saveToAccount: saved === "granted" ? "denied" : null,
  };
}
