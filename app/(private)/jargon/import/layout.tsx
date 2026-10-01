import { FolderPlus } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      <PageHeader
        icon={FolderPlus}
        title="Add a collection"
        description="Start an empty collection, or import terms from a JSON file."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
