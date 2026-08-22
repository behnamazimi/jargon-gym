import { Bug } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function DebugLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Bug}
        title="Queue debug"
        description="Every term's smart-queue score and signals — for debugging the ranking, not for studying."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
