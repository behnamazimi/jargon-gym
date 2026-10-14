"use client";

import { useEffect, useRef } from "react";
import { identifyUser, resetAnalytics } from "@/lib/analytics/track";
import { useConsent } from "@/lib/consent/store";

export function AnalyticsIdentity({ user }: { user: { id: string; email: string | null } }) {
  const identifiedUserId = useRef<string | null>(null);
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "granted") {
      identifiedUserId.current = null;
      return;
    }
    if (identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) resetAnalytics();
    identifyUser(user.id, user.email);
    identifiedUserId.current = user.id;
  }, [user, consent]);

  return null;
}
