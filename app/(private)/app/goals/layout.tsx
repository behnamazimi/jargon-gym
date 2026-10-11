import type { Metadata } from "next";
import { PageBadge } from "@/components/illustrations/scenes/page-badge";
import { PageHeader } from "@/components/shared/page-header";
import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";

export const metadata: Metadata = { title: "Goals" };

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6 max-md:space-y-4 max-md:py-4">
      <PageHeader
        badge={<PageBadge page="goals" />}
        title="Goals"
        description="A daily pace for each tier, and where it takes you."
        compactOnPhone
      />
      <PromoVisit target="goals" />
      {children}
    </PageShell>
  );
}
