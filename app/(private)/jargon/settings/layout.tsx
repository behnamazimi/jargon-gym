import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      <PageHeader icon={Settings2} title="Settings" compactOnPhone />
      {children}
    </PageShell>
  );
}
