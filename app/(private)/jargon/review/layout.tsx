import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={BookOpen}
        title="Review"
        description="Practice recall with flashcards from your active collections."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
