import { Scale } from "lucide-react";
import type { ReactNode } from "react";
import {
  ContentPageHeader,
  ContentPageIntro,
  ContentPageMain,
  ContentPageShell,
} from "@/components/content/content-page-shell";
import { PUBLIC_HOME_PATH } from "@/components/shared/back-link";

type LegalPageProps = {
  title: string;
  description: string;
  updated: string;
  children: ReactNode;
};

export function LegalPage({ title, description, updated, children }: LegalPageProps) {
  return (
    <ContentPageShell>
      <ContentPageIntro>
        <ContentPageHeader
          icon={Scale}
          title={title}
          description={description}
          backHref={PUBLIC_HOME_PATH}
          backLabel="Back to home"
        />
        <p className="m-0 text-xs text-base-content/60">Last updated {updated}</p>
      </ContentPageIntro>
      <ContentPageMain>{children}</ContentPageMain>
    </ContentPageShell>
  );
}
