"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { AUTHENTICATED_HOME_PATH } from "@/lib/auth/safe-next-path";
import { isStudyPath } from "@/lib/chrome";

const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/complete-signup",
]);

export function LoggedOutHeaderNav() {
  const pathname = usePathname();

  if (AUTH_ROUTES.has(pathname)) {
    return null;
  }

  return <LinkButton href="/login">Log in</LinkButton>;
}

export function FeaturesNavLink() {
  const pathname = usePathname();

  if (AUTH_ROUTES.has(pathname) || isStudyPath(pathname)) {
    return null;
  }

  return (
    <Link
      href="/features"
      aria-current={pathname === "/features" ? "page" : undefined}
      className="btn btn-ghost"
    >
      Features
    </Link>
  );
}

/** Inside the app the header shows the study links; on public pages a single link into the app. */
export function SignedInHeaderNav({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/complete-signup") {
    return null;
  }

  if (isStudyPath(pathname)) {
    return <nav className="flex items-center gap-1">{children}</nav>;
  }

  return (
    <>
      <FeaturesNavLink />
      <Link href={AUTHENTICATED_HOME_PATH} className="btn btn-ghost">
        Study
      </Link>
    </>
  );
}

/** For header items that belong to the app: public pages, collections included, don't show them. */
export function StudyPathOnly({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isStudyPath(pathname) ? children : null;
}
