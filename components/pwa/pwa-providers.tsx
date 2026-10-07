"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, useRef, type ReactNode } from "react";
import { PwaInstallProvider } from "@/components/pwa/install-prompt";
import { identifyUser, resetAnalytics } from "@/lib/analytics/track";
import { useConsent } from "@/lib/consent/store";

type PostHogUser = { id: string; email: string | null } | null;

export function PwaProviders({ children, user }: { children: ReactNode; user: PostHogUser }) {
  const identifiedUserId = useRef<string | null>(null);
  const consent = useConsent();

  useEffect(() => {
    if (consent !== "granted") {
      identifiedUserId.current = null;
      return;
    }
    if (!user || identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) resetAnalytics();
    identifyUser(user.id, user.email);
    identifiedUserId.current = user.id;
  }, [user, consent]);

  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
      <PwaInstallProvider>{children}</PwaInstallProvider>
    </SerwistProvider>
  );
}
