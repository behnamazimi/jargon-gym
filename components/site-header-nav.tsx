"use client";

import { BookOpen, Compass, Sparkles, Zap } from "lucide-react";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/jargon/profile-menu";
import { LinkButton } from "@/components/ui/button";

type SiteHeaderNavProps = {
  email: string | null;
  isAdmin?: boolean;
};

const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/complete-signup",
]);

export function SiteHeaderNav({ email, isAdmin = false }: SiteHeaderNavProps) {
  const pathname = usePathname();

  if (!email) {
    if (AUTH_ROUTES.has(pathname)) {
      return null;
    }
    return <LinkButton href="/login">Log in</LinkButton>;
  }

  return (
    <>
      <LinkButton href="/jargon/read" variant="ghost">
        <Zap className="h-4 w-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">Read</span>
      </LinkButton>
      <LinkButton href="/jargon/review" variant="ghost">
        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">Review</span>
      </LinkButton>
      <LinkButton href="/jargon/quiz" variant="ghost">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">Quiz</span>
      </LinkButton>
      <LinkButton href="/jargon/browse" variant="ghost">
        <Compass className="h-4 w-4" />
        <span className="hidden sm:inline">Browse</span>
      </LinkButton>
      <ProfileMenu email={email} isAdmin={isAdmin} />
    </>
  );
}
