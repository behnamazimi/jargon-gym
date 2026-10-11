/**
 * iOS shows a home-screen app's splash only from an image that matches the
 * screen exactly, so there's one per screen size and orientation. Sizes are
 * in CSS pixels; `ratio` is the device pixel ratio.
 */
const SCREENS = [
  // iPhones
  { width: 440, height: 956, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 414, height: 896, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 667, ratio: 2 },
  // iPads
  { width: 1032, height: 1376, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
  { width: 834, height: 1210, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1112, ratio: 2 },
  { width: 810, height: 1080, ratio: 2 },
  { width: 744, height: 1133, ratio: 2 },
  { width: 768, height: 1024, ratio: 2 },
] as const;

type Orientation = "portrait" | "landscape";

export type SplashImage = {
  /** Used in the image's URL, e.g. "390x844x3-portrait". */
  id: string;
  /** Image size in device pixels. */
  width: number;
  height: number;
  media: string;
};

export const SPLASH_IMAGES: SplashImage[] = SCREENS.flatMap(({ width, height, ratio }) =>
  (["portrait", "landscape"] as Orientation[]).map((orientation) => {
    const portrait = orientation === "portrait";
    return {
      id: `${width}x${height}x${ratio}-${orientation}`,
      width: (portrait ? width : height) * ratio,
      height: (portrait ? height : width) * ratio,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
    };
  }),
);

export const splashUrl = (id: string) => `/splash/${id}`;
