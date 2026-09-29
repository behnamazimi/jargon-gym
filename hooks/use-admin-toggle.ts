"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/action";
import { settleAdminAction } from "@/lib/admin/settle-action";

/** A switch that shows its new position at once and falls back to the server's
 *  value if saving fails or when fresh data arrives. */
export function useAdminToggle(
  value: boolean,
  save: (next: boolean) => Promise<ActionResult<unknown>>,
) {
  const [checked, setChecked] = useOptimistic(value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function change(next: boolean) {
    setError(null);
    startTransition(async () => {
      setChecked(next);
      const result = await settleAdminAction(() => save(next));
      if (!result.ok) setError(result.error);
    });
  }

  return { checked, change, error, isPending };
}
