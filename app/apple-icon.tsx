import { ImageResponse } from "next/og";
import { APPLE_ICON_SIZE, BrandMarkImage } from "@/lib/brand-icon";

export const size = {
  width: APPLE_ICON_SIZE,
  height: APPLE_ICON_SIZE,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<BrandMarkImage size={APPLE_ICON_SIZE} rounded={false} />, {
    ...size,
  });
}
