"use client";

import { Compass, Upload } from "lucide-react";
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
      <LinkButton href="/jargon/import" variant="ghost">
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import</span>
      </LinkButton>
      <LinkButton href="/jargon/browse" variant="ghost">
        <Compass className="h-4 w-4" />
        <span className="hidden sm:inline">Browse</span>
      </LinkButton>
      <ProfileMenu email={email} />
    </>
  );
}
