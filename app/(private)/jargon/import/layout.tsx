import { Upload } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter space-y-6">
      <PageHeader
        icon={Upload}
        title="Import jargon"
        description="Paste or upload JSON to add terms to a collection."
      />
      {children}
    </PageShell>
  );
}
