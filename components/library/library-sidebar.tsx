"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { collectionCountsOverride, useLibraryOverrides } from "@/lib/library/overrides";
import { LIBRARY_LAST_DOMAIN_COOKIE, pickLibraryDomainId } from "@/lib/library/pick-domain";
import type { Domain } from "@/lib/terms/types";
import { DomainSidebar } from "./domain-sidebar";
import { DomainSidebarDrawer } from "./domain-sidebar-drawer";

type LibrarySidebarProps = {
  domains: Domain[];
  /** Server time the counts were read. */
  loadedAt: number;
  /** The last-viewed collection as the server saw it. */
  lastDomainId: string | null;
};

function readLastDomainCookie(): string | null {
  const prefix = `${LIBRARY_LAST_DOMAIN_COOKIE}=`;
  const entry = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : null;
}

const noSubscription = () => () => {};

/**
 * The collection list: a drawer on phones, a sticky panel on larger screens.
 * It stays mounted while collections switch (only the page below it
 * reloads), so it works out which one is open the same way the page does.
 */
export function LibrarySidebar({ domains, loadedAt, lastDomainId }: LibrarySidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const requestedDomainId = useSearchParams().get("domain");
  const lastViewed = useSyncExternalStore(noSubscription, readLastDomainCookie, () => lastDomainId);
  const overrides = useLibraryOverrides();

  const liveDomains = useMemo(
    () =>
      domains.map((domain) => {
        const counts = collectionCountsOverride(overrides, domain.id, loadedAt);
        if (!counts) return domain;
        const { termCount, knownCount, termsLearnedCount } = counts;
        return { ...domain, termCount, knownCount, termsLearnedCount };
      }),
    [domains, overrides, loadedAt],
  );

  const currentDomainId =
    pickLibraryDomainId(liveDomains, { requestedDomainId, lastDomainId: lastViewed }) ?? "";
  const currentDomain = liveDomains.find((domain) => domain.id === currentDomainId);
  if (!currentDomain) return null;

  return (
    <>
      <DomainSidebarDrawer
        domains={liveDomains}
        currentDomain={currentDomain}
        currentDomainId={currentDomainId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <aside className="hidden md:flex md:w-68 md:shrink-0">
        <div className="shadow-surface sticky top-4 flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-box bg-base-100 p-2">
          <DomainSidebar
            domains={liveDomains}
            currentDomainId={currentDomainId}
            className="min-h-0 flex-1"
          />
        </div>
      </aside>
    </>
  );
}
