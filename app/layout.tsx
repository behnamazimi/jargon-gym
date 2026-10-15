import type { Metadata, Viewport } from "next";
import { PwaProviders } from "@/components/pwa/pwa-providers";
import { ToastProvider } from "@/components/ui/toast";
import { AuthStateSync } from "@/components/auth-state-sync";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { NativeAuthBridge } from "@/components/native/native-auth-bridge";
import "./globals.css";
import { PWA_DESCRIPTION, PWA_NAME, PWA_THEME_COLOR } from "@/lib/pwa";
import { AUTH_RESTORE_SCRIPT } from "@/lib/auth/auth-state";
import { getPublicBaseUrl } from "@/lib/seo/base-url";
import { SPLASH_IMAGES, splashUrl } from "@/lib/splash";
import { LIGHT_THEME, THEME_RESTORE_SCRIPT } from "@/lib/theme";
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
  title: {
    default: "Lobyas: learn the terms that stick",
    template: "%s | Lobyas",
  },
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
    startupImage: SPLASH_IMAGES.map(({ id, media }) => ({
      url: splashUrl(id),
      media,
    })),
  },
  // Next only writes mobile-web-app-capable, but iOS still needs the Apple
  // name to show the startup images above (vercel/next.js#74524).
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: PWA_THEME_COLOR,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme={LIGHT_THEME}
      data-auth="out"
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_RESTORE_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: AUTH_RESTORE_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <PwaProviders>
          <ToastProvider>
            {children}
            <AuthStateSync />
            <ConsentBanner />
            <NativeAuthBridge />
          </ToastProvider>
        </PwaProviders>
      </body>
    </html>
  );
}
