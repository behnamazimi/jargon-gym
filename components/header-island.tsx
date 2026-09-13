import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { SiteHeader } from "@/components/site-header";

export async function HeaderIsland({ initialIsDark }: { initialIsDark: boolean }) {
  const { user } = await getSessionUser();

  if (!user) {
    return (
      <SiteHeader
        initialIsDark={initialIsDark}
        user={null}
        isAdmin={false}
        currentStreak={0}
        longestStreak={0}
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
        currentStreak={settings.currentStreak}
        longestStreak={settings.longestStreak}
      />
    );
  } catch {
    // Chrome data failure is non-fatal — degrade rather than crash the root error boundary.
    return (
      <SiteHeader
        initialIsDark={initialIsDark}
        user={user}
        isAdmin={false}
        currentStreak={0}
        longestStreak={0}
      />
    );
  }
}
