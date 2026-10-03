import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ReadFocusButton, ReadFocusProvider } from "@/components/read/read-focus";
import { ReadModeTabs } from "@/components/read/read-mode-tabs";
import { StoryHistoryMenu } from "@/components/read/stories/story-history-menu";
import { ReadOptionsMenu } from "@/components/read/read-options-menu";
import { PageShell } from "@/components/page-container";
import { PromoSlot } from "@/components/promos/promo-slot";
import { getSessionUser } from "@/lib/auth/require-session";
import { DEFAULT_READ_OPTIONS, getReadOptions } from "@/lib/read/options";

export const metadata: Metadata = { title: "Read" };

export default async function ReadLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();
  const options = user
    ? await getReadOptions(supabase, user.id).catch(() => DEFAULT_READ_OPTIONS)
    : DEFAULT_READ_OPTIONS;

  return (
    <ReadFocusProvider>
      <PageShell
        className="flex min-h-0 flex-1 flex-col"
        innerClassName="flex min-h-0 flex-1 flex-col gap-3 space-y-0 py-3 md:gap-4 md:py-4 max-md:pb-dock! md:pb-4!"
      >
        <PageHeader
          icon={Zap}
          title="Read"
          description="Read terms one at a time, or inside short AI-written pieces built from your queue."
          compactOnPhone
          showBack={false}
        />
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-3 lg:max-w-2xl">
          <PromoSlot route="read" />
          <div className="flex items-center justify-between gap-2">
            <ReadModeTabs />
            {user ? (
              <div className="flex items-center">
                <Suspense>
                  <StoryHistoryMenu />
                </Suspense>
                <ReadOptionsMenu initialOptions={options} />
                <ReadFocusButton />
              </div>
            ) : null}
          </div>
          {children}
        </div>
      </PageShell>
    </ReadFocusProvider>
  );
}
