import { Signal } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function MasteryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Signal}
        title="Mastery"
        description="Every term's overall strength, across every collection, at a glance."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
