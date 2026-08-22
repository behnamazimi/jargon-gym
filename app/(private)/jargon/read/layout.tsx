import { Zap } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      className="flex min-h-0 flex-1 flex-col"
      innerClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0 py-3 md:gap-4 md:py-4 max-md:pb-dock! md:pb-4!"
    >
      <PageHeader
        icon={Zap}
        title="Read"
        description="One term at a time from your active collections. All matches /read on Telegram; pick one collection to stay in that context."
        compactOnPhone
      />
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
        {children}
      </div>
    </PageShell>
  );
}
