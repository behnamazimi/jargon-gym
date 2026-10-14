"use client";

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { AiCreditsMenuMode } from "@/lib/ai-credits/menu-line";
import { hasAuthCookie } from "@/lib/auth/has-auth-cookie";
import { EMPTY_STREAK } from "@/lib/streak/status";

type Profile = { email: string; isAdmin: boolean; aiCreditsMode: AiCreditsMenuMode };

async function fetchProfile(): Promise<Profile | null> {
  try {
    // A signed-out request is redirected to login; manual keeps that from loading the page.
    const response = await fetch("/api/chrome/profile", { redirect: "manual", cache: "no-store" });
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

  useMountEffect(() => {
    if (!hasAuthCookie()) return;
    let active = true;
    void fetchProfile().then((loaded) => {
      if (active) setProfile(loaded);
    });
    return () => {
      active = false;
    };
  });

  return (
    <SiteHeader
      initialIsDark={initialIsDark}
      user={profile ? { email: profile.email } : null}
      isAdmin={profile?.isAdmin ?? false}
      streak={EMPTY_STREAK}
      aiCreditsMode={profile?.aiCreditsMode ?? "hidden"}
    />
  );
}
