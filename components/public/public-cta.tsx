"use client";

import { useSyncExternalStore } from "react";
import { LandingCtas } from "@/components/landing/landing-ctas";

const subscribe = () => () => {};

// Public pages are cached and rendered without a session, so the server always
// sends the visitor CTA. The auth cookie is readable in the browser, which is
// enough to tell a signed-in user apart without a request. A stale cookie just
// leads to the login page.
function hasAuthCookie() {
  return document.cookie.includes("-auth-token");
}

export function PublicCta() {
  const signedIn = useSyncExternalStore(subscribe, hasAuthCookie, () => false);

  return <LandingCtas isLoggedIn={signedIn} />;
}
