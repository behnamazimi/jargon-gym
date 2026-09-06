"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadReadFullscreenPreference,
  saveReadFullscreenPreference,
} from "@/lib/read/fullscreen-preference";

export function useReadFullscreenPreference() {
  const [preferenceOn, setPreferenceOn] = useState(false);

  useEffect(() => {
    setPreferenceOn(loadReadFullscreenPreference());
  }, []);

  const setPreference = useCallback((enabled: boolean) => {
    setPreferenceOn(enabled);
    saveReadFullscreenPreference(enabled);
  }, []);

  return { preferenceOn, setPreference };
}
