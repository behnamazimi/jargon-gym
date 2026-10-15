import { NextResponse } from "next/server";
import { readGoogleSignInInput, requestGoogleOAuthUrl } from "@/lib/auth/google-oauth";
import { NATIVE_AUTH_REDIRECT } from "@/lib/native/auth-deep-link";

// The app's WebView calls this so the sign-in cookie is set in the WebView;
// the Google step itself then runs in the system browser.
export async function POST(request: Request) {
  const result = await requestGoogleOAuthUrl(
    readGoogleSignInInput(await request.formData()),
    NATIVE_AUTH_REDIRECT,
  );
  return NextResponse.json(result, { status: "url" in result ? 200 : 400 });
}
