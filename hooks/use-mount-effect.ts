"use client";

import { useEffect } from "react";

export function useMountEffect(effect: () => void | (() => void)) {
  // Empty deps are the point: run once on mount, clean up on unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  useEffect(effect, []);
}
