import { ImageResponse } from "next/og";
import { BRAND_ICON, BrandIconImage } from "@/lib/brand-icon";

export const size = {
  width: BRAND_ICON.box,
  height: BRAND_ICON.box,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandIconImage boxSize={BRAND_ICON.box} fill />, {
    ...size,
  });
}
