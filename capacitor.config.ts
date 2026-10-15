import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_URL = "https://lobyas.com";

const config: CapacitorConfig = {
  appId: "com.lobyas.app",
  appName: "Lobyas",
  webDir: "native/www",
  appendUserAgent: "LobyasApp",
  backgroundColor: "#fdfcf9",
  server: {
    // Preview builds point at a Vercel preview with CAP_SERVER_URL.
    url: process.env.CAP_SERVER_URL ?? PRODUCTION_URL,
    allowNavigation: ["lobyas.com", "*.lobyas.com"],
    errorPath: "offline.html",
  },
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: "#fdfcf9" },
  },
};

export default config;
