import { ImageResponse } from "next/og";
import { BrandIconImage } from "@/lib/brand-icon";

const ICON_IDS = {
  "32": { size: 32, maskable: false },
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
} as const;

type IconId = keyof typeof ICON_IDS;

export const contentType = "image/png";

export function generateImageMetadata() {
  return (Object.keys(ICON_IDS) as IconId[]).map((id) => ({
    id,
    contentType,
    size: { width: ICON_IDS[id].size, height: ICON_IDS[id].size },
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = String(await id);
  const icon = iconId in ICON_IDS ? ICON_IDS[iconId as IconId] : ICON_IDS["32"];

  return new ImageResponse(<BrandIconImage boxSize={icon.size} fill maskable={icon.maskable} />, {
    width: icon.size,
    height: icon.size,
  });
}
