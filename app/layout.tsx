import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PwaProviders } from "@/components/pwa/pwa-providers";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import { PWA_DESCRIPTION, PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import { THEME_COOKIE_NAME, DARK_THEME, LIGHT_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";
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
    statusBarStyle: "default",
    title: PWA_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const theme = themeCookie === DARK_THEME ? DARK_THEME : LIGHT_THEME;

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
          <SiteHeader initialIsDark={theme === DARK_THEME} />
          <OfflineBanner />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
        </PwaProviders>
      </body>
    </html>
  );
}
