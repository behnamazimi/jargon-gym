"use client";

import { useMountEffect } from "@/hooks/use-mount-effect";
import { track } from "@/lib/analytics/track";

export function SharedLandingViewed({ signedIn }: { signedIn: boolean }) {
  useMountEffect(() => track("shared_landing_viewed", { signedIn }));
  return null;
}
