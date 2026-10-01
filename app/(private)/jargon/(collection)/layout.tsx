import { cookies } from "next/headers";
import { Suspense } from "react";
import { LibrarySidebar } from "@/components/jargon/library-sidebar";
import { PageShell } from "@/components/page-container";
import { JargonPageSkeleton } from "@/components/page-skeleton";
import { getSessionUser } from "@/lib/auth/require-session";
import { loadLibraryCollections } from "@/lib/jargon/library/load";
import { LIBRARY_LAST_DOMAIN_COOKIE } from "@/lib/jargon/library/pick-domain";

/**
 * The Library's frame and collection sidebar. Layouts don't re-render when
 * only the query changes, so switching collections (?domain=) reloads just
 * the page below while the sidebar stays mounted.
 */
export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<JargonPageSkeleton />}>
      <LibraryFrame>{children}</LibraryFrame>
    </Suspense>
  );
}

async function LibraryFrame({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getSessionUser();
  if (!user) return children;

  // Shared with the page through React's per-request cache, and rendered in
  // parallel with it, so this adds no wait of its own.
  const [collections, cookieStore] = await Promise.all([
    loadLibraryCollections(supabase, user.id).catch(() => null),
    cookies(),
  ]);
  // Empty and failed states are the page's to show, full width.
  if (!collections || collections.domains.length === 0) return children;

  return (
    <PageShell>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <LibrarySidebar
          domains={collections.domains}
          loadedAt={collections.loadedAt}
          lastDomainId={cookieStore.get(LIBRARY_LAST_DOMAIN_COOKIE)?.value ?? null}
        />
        {children}
      </div>
    </PageShell>
  );
}
