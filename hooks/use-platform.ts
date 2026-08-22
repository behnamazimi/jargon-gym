"use client";

import { useEffect, useState } from "react";
import { PLATFORM_MEDIA, readPlatform, SSR_PLATFORM, type PlatformSnapshot } from "@/lib/platform";

export function useMediaQuery(query: string, defaultMatches = false): boolean {
  const [matches, setMatches] = useState(defaultMatches);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    function handleChange(event: MediaQueryListEvent) {
      setMatches(event.matches);
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export function usePlatform(): PlatformSnapshot {
  const [platform, setPlatform] = useState(SSR_PLATFORM);

  useEffect(() => {
    const update = () => setPlatform(readPlatform());
    update();

    const queries = Object.values(PLATFORM_MEDIA).map((query) => window.matchMedia(query));
    for (const media of queries) {
      media.addEventListener("change", update);
    }

    return () => {
      for (const media of queries) {
        media.removeEventListener("change", update);
      }
    };
  }, []);

  return platform;
}
