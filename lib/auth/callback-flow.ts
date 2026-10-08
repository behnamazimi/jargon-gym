/** Set on the confirmation-email link so the callback knows it didn't start from Google. */
export const EMAIL_FLOW = "email";

/** Set on the password-reset link, so a failure blames the link, not Google. */
export const RESET_FLOW = "reset";

function isEmailFlow(flow: string | null): boolean {
  return flow === EMAIL_FLOW || flow === RESET_FLOW;
}

export function callbackFailureError(
  flow: string | null,
): "link-failed" | "reset-failed" | "oauth-failed" {
  if (flow === RESET_FLOW) return "reset-failed";
  return flow === EMAIL_FLOW ? "link-failed" : "oauth-failed";
}

export function callbackSignInMethod(flow: string | null): "email" | "google" {
  return isEmailFlow(flow) ? "email" : "google";
}
