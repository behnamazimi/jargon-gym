"use client";

import { useRouter } from "next/navigation";
import { useMountEffect } from "@/hooks/use-mount-effect";
import {
  hasReadLandingPreference,
  readLandingRedirect,
  saveReadLandingPreference,
} from "@/lib/read/landing";

/** Keeps the landing cookie in step with the saved option, which may have
 *  changed on another device. Mounted by the Cards and Stories pages, not the
 *  layout, so it never runs on a page that is about to redirect. On a device
 *  with no cookie yet the proxy couldn't redirect, so Cards passes
 *  `redirectToStories` and this does it once in the browser. */
export function ReadLandingSync({
  storiesDefault,
  redirectToStories = false,
}: {
  storiesDefault: boolean;
  redirectToStories?: boolean;
}) {
  const router = useRouter();
  useMountEffect(() => {
    const firstVisit = !hasReadLandingPreference();
    saveReadLandingPreference(storiesDefault);
    if (!(redirectToStories && storiesDefault && firstVisit)) return;
    const target = readLandingRedirect(
      window.location.pathname,
      new URLSearchParams(window.location.search),
      "stories",
    );
    if (target) router.replace(target);
  });
  return null;
}
