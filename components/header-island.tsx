import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { aiCreditsMenuMode } from "@/lib/llm/central";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { EMPTY_STREAK } from "@/lib/streak/status";
import { SiteHeader } from "@/components/site-header";

export async function HeaderIsland({ initialIsDark }: { initialIsDark: boolean }) {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <SiteHeader
        initialIsDark={initialIsDark}
        user={null}
        isAdmin={false}
        streak={EMPTY_STREAK}
        aiCreditsMode="hidden"
      />
    );
  }

  try {
    const [isAdmin, settings] = await Promise.all([
      getUserIsAdmin(user.id),
      getStudyPhoneUserSettings(user.id),
    ]);
    return (
      <SiteHeader
        initialIsDark={initialIsDark}
        user={user}
        isAdmin={isAdmin}
        streak={settings.streak}
        aiCreditsMode={aiCreditsMenuMode()}
      />
    );
  } catch {
    // Chrome data failure is non-fatal — degrade rather than crash the root error boundary.
    return (
      <SiteHeader
        initialIsDark={initialIsDark}
        user={user}
        isAdmin={false}
        streak={EMPTY_STREAK}
        aiCreditsMode="hidden"
      />
    );
  }
}
