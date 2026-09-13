import { getSessionUser } from "@/lib/auth/require-session";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { TimezoneSync } from "@/components/timezone-sync";

export async function TimezoneSyncIsland() {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    const settings = await getStudyPhoneUserSettings(user.id);
    return <TimezoneSync savedTimezone={settings.timezone} />;
  } catch {
    return <TimezoneSync savedTimezone={null} />;
  }
}
