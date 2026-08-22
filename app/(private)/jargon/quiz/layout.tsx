import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/jargon/page-header";
import { PageShell } from "@/components/page-container";

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      className="flex min-h-0 flex-1 flex-col"
      innerClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0 py-3 md:gap-4 md:py-4 max-md:pb-dock! md:pb-4!"
    >
      <PageHeader
        icon={Sparkles}
        title="Quiz"
        description="Test yourself on terms from your active collections."
        compactOnPhone
      />
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
        {children}
      </div>
    </PageShell>
  );
}
