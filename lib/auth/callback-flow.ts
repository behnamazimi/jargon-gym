/** Set on the confirmation-email link so the callback knows it didn't start from Google. */
export const EMAIL_FLOW = "email";

function isEmailFlow(flow: string | null): boolean {
  return flow === EMAIL_FLOW;
}

export function callbackFailureError(flow: string | null): "link-failed" | "oauth-failed" {
  return isEmailFlow(flow) ? "link-failed" : "oauth-failed";
}

export function callbackSignInMethod(flow: string | null): "email" | "google" {
  return isEmailFlow(flow) ? "email" : "google";
}
