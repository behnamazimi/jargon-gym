import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { PwaProviders } from "@/components/pwa/pwa-providers";
import { AdminProvider } from "@/components/admin-only";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import { getSessionUser, getUserIsAdmin } from "@/lib/auth/require-session";
import { PWA_DESCRIPTION, PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import { getStudyPhoneUserSettings } from "@/lib/streak/settings";
import { THEME_COOKIE_NAME, DARK_THEME, LIGHT_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { TimezoneSync } from "@/components/timezone-sync";
import { Geist, Inter, JetBrains_Mono } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [cookieStore, { supabase, user }] = await Promise.all([cookies(), getSessionUser()]);
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = themeCookie === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  const isAdmin = user ? await getUserIsAdmin(user.id) : false;
  const initialIsDark = theme === DARK_THEME;
  const studyPhoneSettings = user ? await getStudyPhoneUserSettings(supabase, user.id) : null;

  return (
    <html
      lang="en"
      data-theme={theme}
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geist.variable,
        inter.variable,
        jetbrainsMono.variable,
        "font-sans",
      )}
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <PwaProviders>
          <ToastProvider>
            <AdminProvider isAdmin={isAdmin}>
              <AppShell
                header={
                  <SiteHeader
                    initialIsDark={initialIsDark}
                    user={user}
                    isAdmin={isAdmin}
                    currentStreak={studyPhoneSettings?.currentStreak ?? 0}
                  />
                }
                footer={<SiteFooter />}
                studyPhone={
                  user
                    ? {
                        email: user.email ?? "Account",
                        isAdmin,
                        initialIsDark,
                        currentStreak: studyPhoneSettings?.currentStreak ?? 0,
                      }
                    : null
                }
              >
                {user ? (
                  <TimezoneSync savedTimezone={studyPhoneSettings?.timezone ?? null} />
                ) : null}
                <OfflineBanner />
                <main className="flex min-h-0 flex-1 flex-col">{children}</main>
              </AppShell>
            </AdminProvider>
          </ToastProvider>
        </PwaProviders>
      </body>
    </html>
  );
}
