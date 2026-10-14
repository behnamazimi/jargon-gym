import { Suspense } from "react";
import { AppFooter } from "@/components/app-footer";
import { AppShell } from "@/components/app-shell";
import { AnalyticsIdentity } from "@/components/pwa/analytics-identity";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { ConsentSyncIsland } from "@/components/consent/consent-sync-island";
import { SiteFooter } from "@/components/site-footer";
import { HeaderIsland } from "@/components/header-island";
import { HeaderSkeleton } from "@/components/page-skeleton";
import { StudyPhoneChromeIsland } from "@/components/app/study-phone-chrome-island";
import { StudyPhoneDockSkeleton } from "@/components/app/study-phone-dock-skeleton";
import { StudyPhoneTopBarSkeleton } from "@/components/app/study-phone-topbar-skeleton";
import { TimezoneSyncIsland } from "@/components/timezone-sync-island";
import { TourIsland } from "@/components/tour/tour-island";
import { GoalsIsland } from "@/components/goals/goals-island";
import { getSessionUser, hasLikelySession } from "@/lib/auth/require-session";
import { BROWSER_TIMEZONE_SCRIPT } from "@/lib/streak/browser-timezone";
import { DARK_THEME } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";

/** The page frame for routes that know who is signed in: header, footer, the
 *  phone study bar and the per-account islands. Pages that are cached without a
 *  session use StaticChrome instead, so a layout shared with them never holds
 *  one person's account. */
export async function AppChrome({ children }: { children: React.ReactNode }) {
  const [theme, hasSession, { user }] = await Promise.all([
    getTheme(),
    hasLikelySession(),
    getSessionUser(),
  ]);
  const initialIsDark = theme === DARK_THEME;

  return (
    <>
      {user && <script dangerouslySetInnerHTML={{ __html: BROWSER_TIMEZONE_SCRIPT }} />}
      {user && <AnalyticsIdentity user={user} />}
      <AppShell
        header={
          <Suspense fallback={<HeaderSkeleton hasLikelySession={hasSession} />}>
            <HeaderIsland initialIsDark={initialIsDark} />
          </Suspense>
        }
        footer={<SiteFooter />}
        appFooter={<AppFooter />}
        studyPhoneChrome={
          <Suspense
            fallback={
              <>
                <StudyPhoneTopBarSkeleton />
                <StudyPhoneDockSkeleton />
              </>
            }
          >
            <StudyPhoneChromeIsland initialIsDark={initialIsDark} />
          </Suspense>
        }
        hasLikelySession={hasSession}
      >
        <Suspense fallback={null}>
          <TimezoneSyncIsland />
        </Suspense>
        <Suspense fallback={null}>
          <ConsentSyncIsland />
        </Suspense>
        <Suspense fallback={null}>
          <TourIsland />
        </Suspense>
        <Suspense fallback={null}>
          <GoalsIsland />
        </Suspense>
        <OfflineBanner />
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </AppShell>
    </>
  );
}
