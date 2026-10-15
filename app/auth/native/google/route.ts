import { NextResponse } from "next/server";
import { readGoogleSignInInput, requestGoogleOAuthUrl } from "@/lib/auth/google-oauth";
import { NATIVE_AUTH_REDIRECT } from "@/lib/native/auth-deep-link";
import { NATIVE_REQUEST_HEADER } from "@/lib/native/shell";

// The app's WebView calls this so the sign-in cookie is set in the WebView;
// the Google step itself then runs in the system browser.
export async function POST(request: Request) {
  if (request.headers.get(NATIVE_REQUEST_HEADER) !== "1") {
    return NextResponse.json({ error: "oauth-failed" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "oauth-failed" }, { status: 400 });
  }

  const result = await requestGoogleOAuthUrl(readGoogleSignInInput(formData), NATIVE_AUTH_REDIRECT);
  return NextResponse.json(result, { status: "url" in result ? 200 : 400 });
}
