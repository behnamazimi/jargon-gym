"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnalyticsIdentity } from "@/components/pwa/analytics-identity";
import { SiteHeader } from "@/components/site-header";
import type { AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import { isSignedIn, onAuthChange } from "@/lib/auth/auth-state";
import { EMPTY_STREAK } from "@/lib/streak/status";

type Profile = {
  id: string;
  email: string | null;
  isAdmin: boolean;
  aiCreditsMode: AiCreditsMenuMode;
};

async function fetchProfile(): Promise<Profile | null> {
  try {
    // A signed-out request is redirected to login; manual keeps that from loading the page.
    const response = await fetch("/api/chrome/profile", {
      redirect: "manual",
      cache: "no-store",
    });
    return response.ok ? ((await response.json()) as Profile) : null;
  } catch {
    return null;
  }
}

/** The header for pages rendered without a session. Cached public pages are
 *  rendered this way for everyone, so a signed-in visitor is spotted from the
 *  auth cookie and gets their account menu once it loads. */
export function VisitorHeader({ initialIsDark }: { initialIsDark: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const pathname = usePathname();

  // The layout outlives soft navigations (login, logout), so the account is
  // loaded again whenever the signed-in state or the page changes.
  useEffect(() => {
    let active = true;
    function refresh() {
      if (!isSignedIn()) {
        setProfile(null);
        return;
      }
      void fetchProfile().then((loaded) => {
        if (active) setProfile(loaded);
      });
    }
    refresh();
    const stopListening = onAuthChange(refresh);
    return () => {
      active = false;
      stopListening();
    };
  }, [pathname]);

  return (
    <>
      {profile && <AnalyticsIdentity user={profile} />}
      <SiteHeader
        initialIsDark={initialIsDark}
        user={profile ? { email: profile.email ?? "Account" } : null}
        isAdmin={profile?.isAdmin ?? false}
        cachedPage
        streak={EMPTY_STREAK}
        aiCreditsMode={profile?.aiCreditsMode ?? "hidden"}
      />
    </>
  );
}
