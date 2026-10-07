import { ConsentSync } from "@/components/consent/consent-sync";
import { getSessionUser } from "@/lib/auth/require-session";
import { savedConsent } from "@/lib/consent/repository";
import { getRequestUserSettingsRow } from "@/lib/streak/settings";

export async function ConsentSyncIsland() {
  const { user } = await getSessionUser();
  if (!user) return null;

  try {
    return <ConsentSync saved={savedConsent(await getRequestUserSettingsRow(user.id))} />;
  } catch {
    return null;
  }
}
