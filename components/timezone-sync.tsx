"use client";

import { useEffect } from "react";
import { syncTimezoneAction } from "@/app/(private)/actions";

/** Silently syncs the browser's IANA timezone to the server once it differs from what's stored. */
export function TimezoneSync({ savedTimezone }: { savedTimezone: string | null }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== savedTimezone) {
      void syncTimezoneAction(detected);
    }
  }, [savedTimezone]);

  return null;
}
