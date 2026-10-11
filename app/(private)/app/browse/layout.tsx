import type { Metadata } from "next";
import { PageBadge } from "@/components/illustrations/scenes/page-badge";
import { PageHeader } from "@/components/shared/page-header";
import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";
import { SectionTransition } from "@/components/shared/view-transitions";

export const metadata: Metadata = { title: "Browse collections" };

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <SectionTransition>
      <PageShell innerClassName="landing-enter mx-auto max-w-3xl max-md:space-y-0 max-md:py-4 max-md:pb-[calc(2rem+var(--safe-bottom))]">
        <PageHeader
          badge={<PageBadge page="browse" />}
          title="Browse collections"
          description="Add built-in collections, or community ones other members have shared."
          compactOnPhone
        />
        <PromoVisit target="browse" />
        {children}
      </PageShell>
    </SectionTransition>
  );
}
