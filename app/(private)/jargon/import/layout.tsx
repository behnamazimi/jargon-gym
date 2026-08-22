import { Upload } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      <PageHeader
        icon={Upload}
        title="Import jargon"
        description="Paste or upload JSON to add terms to a collection."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
