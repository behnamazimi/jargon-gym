"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Builds the page again, so every rank and cooldown is recomputed for the current time. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm max-md:min-h-11"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw aria-hidden className={pending ? "size-4 animate-spin" : "size-4"} />
      Refresh
    </button>
  );
}
