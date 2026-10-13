"use client";

import { useEffect } from "react";
import { saveInBackground } from "@/lib/background-save";

/** Silently syncs the browser's IANA timezone to the server once it differs from what's stored. */
export function TimezoneSync({ savedTimezone }: { savedTimezone: string | null }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== savedTimezone) {
      void saveInBackground("/api/settings/timezone", { timezone: detected });
    }
  }, [savedTimezone]);

  return null;
}
