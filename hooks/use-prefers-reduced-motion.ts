"use client";

import { useMediaQuery } from "@/hooks/use-platform";
import { PLATFORM_MEDIA } from "@/lib/platform";

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(PLATFORM_MEDIA.reducedMotion);
}
