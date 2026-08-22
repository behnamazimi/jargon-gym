import { ImageResponse } from "next/og";
import { PwaScreenshot } from "@/lib/pwa-screenshot";
import { PWA_SCREENSHOT_WIDE } from "@/lib/pwa";

export function GET() {
  return new ImageResponse(<PwaScreenshot layout="wide" />, PWA_SCREENSHOT_WIDE);
}
