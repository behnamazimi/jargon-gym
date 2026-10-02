import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";

export default function TriageLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell
      className="flex min-h-0 flex-1 flex-col"
      innerClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0 py-3 md:gap-4 md:py-4 max-md:pb-dock! md:pb-4!"
    >
      <PromoVisit target="triage" />
      {children}
    </PageShell>
  );
}
