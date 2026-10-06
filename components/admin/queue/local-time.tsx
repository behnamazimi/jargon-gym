"use client";

import { useSyncExternalStore } from "react";
import { formatAdminDateTime, formatRelative } from "@/lib/admin/format";

const noSubscription = () => () => {};

/** Prints UTC on the server and for the first render, then the viewer's own
 *  time zone, so hydration always matches. The relative part counts from `asOf`
 *  (when the page was built), so it doesn't tick. */
export function LocalTime({ iso, asOfIso }: { iso: string; asOfIso: string }) {
  const absolute = useSyncExternalStore(
    noSubscription,
    () =>
      new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    () => formatAdminDateTime(iso),
  );
  return (
    <span className="whitespace-nowrap">
      {absolute}{" "}
      <span className="text-base-content/55">
        ({formatRelative(new Date(iso), new Date(asOfIso))})
      </span>
    </span>
  );
}
