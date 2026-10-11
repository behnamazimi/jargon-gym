import { ImageResponse } from "next/og";
import { BrandSplash } from "@/lib/brand-icon";
import { SPLASH_IMAGES } from "@/lib/splash";

// Every size is drawn at build time; an unknown one is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return SPLASH_IMAGES.map(({ id }) => ({ id }));
}

export async function GET(_request: Request, { params }: RouteContext<"/splash/[id]">) {
  const { id } = await params;
  const image = SPLASH_IMAGES.find((splash) => splash.id === id);
  if (!image) return new Response(null, { status: 404 });

  return new ImageResponse(<BrandSplash width={image.width} height={image.height} />, {
    width: image.width,
    height: image.height,
  });
}
