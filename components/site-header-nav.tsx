"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export function HiddenUntilSignupComplete({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  if (pathname === "/complete-signup") {
    return null;
  }

  return <nav className={cn("flex items-center gap-1", className)}>{children}</nav>;
}
