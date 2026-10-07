import { cookies } from "next/headers";
import { CONSENT_COOKIE } from "./consent";

/** Whether the visitor behind this request allowed analytics. Only works inside a request. */
export async function hasAnalyticsConsent(): Promise<boolean> {
  return (await cookies()).get(CONSENT_COOKIE)?.value === "granted";
}
