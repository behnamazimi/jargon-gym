import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="space-y-8">
      <PageHeader
        icon={Sparkles}
        title="Quiz"
        description="Test yourself on terms from your active collections."
        compactOnPhone
      />
      {children}
    </PageShell>
  );
}
