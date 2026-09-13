"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadReadFullscreenPreference,
  saveReadFullscreenPreference,
  subscribeReadFullscreenPreference,
} from "@/lib/read/fullscreen-preference";

export function useReadFullscreenPreference() {
  const preferenceOn = useSyncExternalStore(
    subscribeReadFullscreenPreference,
    loadReadFullscreenPreference,
    () => false,
  );

  const setPreference = useCallback((enabled: boolean) => {
    saveReadFullscreenPreference(enabled);
  }, []);

  return { preferenceOn, setPreference };
}
