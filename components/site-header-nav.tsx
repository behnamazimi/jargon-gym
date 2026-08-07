"use client";

import { BookOpen, Compass } from "lucide-react";
import { ProfileMenu } from "@/components/jargon/profile-menu";
import { LinkButton } from "@/components/ui/button";

type SiteHeaderNavProps = {
  email: string | null;
};

export function SiteHeaderNav({ email }: SiteHeaderNavProps) {
  if (!email) {
    return <LinkButton href="/login">Log in</LinkButton>;
  }

  return (
    <>
      <LinkButton href="/jargon/review" variant="ghost">
        <BookOpen className="h-4 w-4" strokeWidth={1.5} />
        <span className="hidden sm:inline">Review</span>
      </LinkButton>
      <LinkButton href="/jargon/browse" variant="ghost">
        <Compass className="h-4 w-4" />
        <span className="hidden sm:inline">Browse</span>
      </LinkButton>
      <ProfileMenu email={email} />
    </>
  );
}
