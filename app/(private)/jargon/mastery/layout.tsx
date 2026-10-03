import { Signal } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";

export default function MasteryLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="mx-auto max-w-3xl space-y-6">
      <PageHeader
        icon={Signal}
        title="Mastery"
        description="How well you remember your terms."
        compactOnPhone
      />
      <PromoVisit target="mastery" />
      {children}
    </PageShell>
  );
}
