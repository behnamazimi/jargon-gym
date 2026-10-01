import { setVerifiedUser } from "./verified-user-header";

/** Headers as the proxy would forward them for this user, for route tests.
 *  Uses a stand-in signing secret when none is configured. */
export async function signedUserHeaders(
  id: string,
  email: string | null = null,
): Promise<Record<string, string>> {
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-signing-secret";
  const headers = new Headers();
  await setVerifiedUser(headers, { id, email });
  return Object.fromEntries(headers);
}
