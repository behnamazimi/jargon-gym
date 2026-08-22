import { ImageResponse } from "next/og";
import { PwaScreenshot } from "@/lib/pwa-screenshot";
import { PWA_SCREENSHOT_NARROW } from "@/lib/pwa";

export function GET() {
  return new ImageResponse(<PwaScreenshot layout="narrow" />, PWA_SCREENSHOT_NARROW);
}
