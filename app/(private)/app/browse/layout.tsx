import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PromoVisit } from "@/components/promos/promo-visit";
import { PageShell } from "@/components/page-container";

export const metadata: Metadata = { title: "Browse" };

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageShell innerClassName="landing-enter mx-auto max-w-3xl max-md:space-y-0 max-md:py-4 max-md:pb-[calc(2rem+var(--safe-bottom))]">
      <PageHeader
        icon={Compass}
        title="Browse collections"
        description="Add built-in collections, or ones other members have shared."
        compactOnPhone
      />
      <PromoVisit target="browse" />
      {children}
    </PageShell>
  );
}
