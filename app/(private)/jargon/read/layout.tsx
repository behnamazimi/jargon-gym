import { Zap } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Zap}
        title="Read"
        description="One term at a time from your active collections. All matches /read on Telegram; pick one collection to stay in that context."
        compactOnPhone
      />
      <div className="mx-auto w-full max-w-xl space-y-4">{children}</div>
    </PageShell>
  );
}
