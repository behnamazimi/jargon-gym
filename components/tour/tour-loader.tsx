"use client";

import dynamic from "next/dynamic";
import type { TourState } from "@/lib/tour/state";

// Client-only and split out, so accounts that finished the tour never load it.
const TourRunner = dynamic(() => import("./tour-runner").then((mod) => mod.TourRunner), {
  ssr: false,
});

export function TourLoader({ initialState }: { initialState: TourState }) {
  return <TourRunner initialState={initialState} />;
}
