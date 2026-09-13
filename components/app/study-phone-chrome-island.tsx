import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import {
  StudyPhoneDock,
  StudyPhoneProvider,
  StudyPhoneTopBar,
} from "@/components/app/study-phone-chrome";

export async function StudyPhoneChromeIsland({ initialIsDark }: { initialIsDark: boolean }) {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    const [isAdmin, settings] = await Promise.all([
      getUserIsAdmin(user.id),
      getStudyPhoneUserSettings(user.id),
    ]);
    return (
      <StudyPhoneProvider
        email={user.email ?? "Account"}
        isAdmin={isAdmin}
        initialIsDark={initialIsDark}
        currentStreak={settings.currentStreak}
        longestStreak={settings.longestStreak}
      >
        <StudyPhoneTopBar />
        <StudyPhoneDock />
      </StudyPhoneProvider>
    );
  } catch {
    // Chrome data failure is non-fatal — same posture as HeaderIsland.
    return null;
  }
}
