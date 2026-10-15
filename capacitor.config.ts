import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = "https://lobyas.com";

// Preview builds point at a Vercel preview with CAP_SERVER_URL.
const serverUrl = process.env.CAP_SERVER_URL || PRODUCTION_URL;

const config: CapacitorConfig = {
  appId: "com.lobyas.app",
  appName: "Lobyas",
  webDir: "native/www",
  backgroundColor: "#fdfcf9",
  server: {
    url: serverUrl,
    allowNavigation: ["lobyas.com", "*.lobyas.com", new URL(serverUrl).hostname],
    errorPath: "offline.html",
  },
  ios: {
    appendUserAgent: "LobyasApp/ios",
    // Lets the service worker run in WKWebView. Info.plist lists the allowed
    // domain, so it can't apply to a preview host.
    limitsNavigationsToAppBoundDomains: serverUrl === PRODUCTION_URL,
  },
  android: {
    appendUserAgent: "LobyasApp/android",
  },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: "#fdfcf9" },
  },
};

export default config;
