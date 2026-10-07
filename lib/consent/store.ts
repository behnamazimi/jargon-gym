"use client";

import { useSyncExternalStore } from "react";
import { saveAnalyticsConsentAction } from "@/app/(private)/app/actions-consent";
import { startAnalytics, stopAnalytics } from "@/lib/analytics/client";
import { hasAuthCookie } from "@/lib/auth/has-auth-cookie";
import { consentFromCookieHeader, serializeConsentCookie, type Consent } from "./consent";

export const CONSENT_BANNER_ID = "consent-banner";

const listeners = new Set<() => void>();
let reopened = false;
let focusPending = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

function readConsent() {
  return consentFromCookieHeader(document.cookie);
}

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, readConsent, () => null);
}

/** The banner shows until a choice is made, and again when someone reopens it. */
export function useConsentPromptOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => reopened || readConsent() === null,
    () => false,
  );
}

/** Reopens the banner; it takes focus when it mounts, since it sits at the end of the page. */
export function openConsentChoices() {
  reopened = true;
  focusPending = true;
  notify();
}

/** Called as the banner mounts: true once after it was reopened on request. */
export function takeConsentFocusRequest() {
  const pending = focusPending;
  focusPending = false;
  return pending;
}

/** Puts a choice into effect on this device only. */
export function applyConsent(consent: Consent) {
  document.cookie = serializeConsentCookie(consent, location.protocol === "https:");
  reopened = false;
  if (consent === "granted") startAnalytics();
  else stopAnalytics();
  notify();
}

/** A choice made in the banner: applied here, and recorded on the account when signed in. */
export function setConsent(consent: Consent) {
  applyConsent(consent);
  persistConsent(consent);
}

/** Records a choice on the account when signed in. A failed save is retried by the next page load's sync. */
export function persistConsent(consent: Consent) {
  if (!hasAuthCookie()) return;
  saveAnalyticsConsentAction(consent).then(
    (result) => {
      if (result.error) console.error("Couldn't save the analytics choice:", result.error);
    },
    (err: unknown) => console.error("Couldn't save the analytics choice:", err),
  );
}
