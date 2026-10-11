import type { Metadata } from "next";
import { PageBadge } from "@/components/illustrations/scenes/page-badge";
import { PageHeader } from "@/components/shared/page-header";
import { PromoSlot } from "@/components/promos/promo-slot";
import { PageShell } from "@/components/page-container";
import { TermLayoutScope } from "@/components/terms/term-layout-scope";
import { SectionTransition } from "@/components/shared/view-transitions";

export const metadata: Metadata = { title: "Review" };

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <TermLayoutScope>
      <SectionTransition>
        <PageShell
          className="flex min-h-0 flex-1 flex-col"
          innerClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0 py-3 md:gap-4 md:py-4 max-md:pb-dock! md:pb-4!"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
            <PageHeader
              badge={<PageBadge page="review" />}
              title="Review"
              description="Recall each term, then check it."
              compactOnPhone
              showBack={false}
            />
            <PromoSlot route="review" />
            {children}
          </div>
        </PageShell>
      </SectionTransition>
    </TermLayoutScope>
  );
}
