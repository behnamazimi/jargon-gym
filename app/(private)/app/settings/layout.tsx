import type { Metadata } from "next";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageShell } from "@/components/page-container";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      <PageHeader icon={Settings2} title="Settings" compactOnPhone />
      {children}
    </PageShell>
  );
}
