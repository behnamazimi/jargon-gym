import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { PwaProviders } from "@/components/pwa/pwa-providers";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { HeaderIsland } from "@/components/header-island";
import { HeaderSkeleton } from "@/components/page-skeleton";
import { StudyPhoneChromeIsland } from "@/components/app/study-phone-chrome-island";
import { StudyPhoneTopBarSkeleton } from "@/components/app/study-phone-topbar-skeleton";
import { TimezoneSyncIsland } from "@/components/timezone-sync-island";
import { TourIsland } from "@/components/tour/tour-island";
import "./globals.css";
import { hasLikelySession } from "@/lib/auth/require-session";
import { PWA_DESCRIPTION, PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
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
  applicationName: PWA_NAME,
  title: PWA_NAME,
  description: PWA_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
  const [theme, hasSession] = await Promise.all([getTheme(), hasLikelySession()]);
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
        <PwaProviders>
          <ToastProvider>
            <AppShell
              header={
                <Suspense fallback={<HeaderSkeleton hasLikelySession={hasSession} />}>
                  <HeaderIsland initialIsDark={initialIsDark} />
                </Suspense>
              }
              footer={<SiteFooter />}
              studyPhoneChrome={
                <Suspense fallback={<StudyPhoneTopBarSkeleton />}>
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
