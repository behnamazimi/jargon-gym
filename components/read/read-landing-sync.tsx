"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { saveReadLandingPreference } from "@/lib/read/landing";

/** Keeps the landing cookie in step with the saved option, which may have
 *  changed on another device. Mounted by the Cards and Stories pages, not the
 *  layout, so it never runs on a page that is about to redirect. */
export function ReadLandingSync({ storiesDefault }: { storiesDefault: boolean }) {
  useMountEffect(() => saveReadLandingPreference(storiesDefault));
  return null;
}
