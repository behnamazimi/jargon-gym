import type { Metadata } from "next";
import { PageBadge } from "@/components/illustrations/scenes/page-badge";
import { PageHeader } from "@/components/shared/page-header";
import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";

export const metadata: Metadata = { title: "Mastery" };

export default function MasteryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader
        badge={<PageBadge page="mastery" />}
        title="Mastery"
        description="How well you remember your terms."
        compactOnPhone
      />
      <PromoVisit target="mastery" />
      {children}
    </PageShell>
  );
}
