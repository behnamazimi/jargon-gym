import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppFooter } from "@/components/app-footer";
import { AppShell } from "@/components/app-shell";
import { PwaProviders } from "@/components/pwa/pwa-providers";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { HeaderIsland } from "@/components/header-island";
import { HeaderSkeleton } from "@/components/page-skeleton";
import { StudyPhoneChromeIsland } from "@/components/app/study-phone-chrome-island";
import { StudyPhoneDockSkeleton } from "@/components/app/study-phone-dock-skeleton";
import { StudyPhoneTopBarSkeleton } from "@/components/app/study-phone-topbar-skeleton";
import { TimezoneSyncIsland } from "@/components/timezone-sync-island";
import { TourIsland } from "@/components/tour/tour-island";
import "./globals.css";
import { getSessionUser, hasLikelySession } from "@/lib/auth/require-session";
import { PWA_DESCRIPTION, PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { DARK_THEME } from "@/lib/theme";
import { getTheme } from "@/lib/theme-server";
import { cn } from "@/lib/utils";
import { Figtree, Fraunces, JetBrains_Mono } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicBaseUrl()),
  applicationName: PWA_NAME,
  title: { default: "Lobyas: learn the terms that stick", template: "%s | Lobyas" },
  description: PWA_DESCRIPTION,
  openGraph: {
    siteName: PWA_NAME,
    title: "Lobyas: learn the terms that stick",
    description: PWA_DESCRIPTION,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    // Translucent makes iOS 26 size the home-screen web view short of the screen
    // bottom (WebKit bug 301108), leaving a gap under the dock.
    statusBarStyle: "default",
    title: PWA_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [theme, hasSession, { user }] = await Promise.all([
    getTheme(),
    hasLikelySession(),
    getSessionUser(),
  ]);
  const initialIsDark = theme === DARK_THEME;

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        figtree.variable,
        fraunces.variable,
        jetbrainsMono.variable,
        "font-sans",
      )}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <PwaProviders user={user}>
          <ToastProvider>
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
                <TourIsland />
              </Suspense>
              <OfflineBanner />
              <main className="flex min-h-0 flex-1 flex-col">{children}</main>
            </AppShell>
          </ToastProvider>
        </PwaProviders>
      </body>
    </html>
  );
}
