"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  consentFromCookieHeader,
  currentSavedChoice,
  syncConsent,
  type SavedConsent,
} from "@/lib/consent/consent";
import { applyConsent, persistConsent } from "@/lib/consent/store";

/** Lines this device's analytics choice up with the one saved on the account. */
export function ConsentSync({ saved }: { saved: SavedConsent | null }) {
  useMountEffect(() => {
    const result = syncConsent(consentFromCookieHeader(document.cookie), currentSavedChoice(saved));
    if (result.setCookie) applyConsent(result.setCookie);
    if (result.saveToAccount) persistConsent(result.saveToAccount);
  });

  return null;
}
