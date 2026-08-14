import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function StatLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Stats"
        description="What's stale, struggling, and waiting across your collections."
      />
      {children}
    </PageShell>
  );
}
