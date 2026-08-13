"use client";

import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/button";

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
