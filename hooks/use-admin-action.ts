"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/admin/action";
import { settleAdminAction } from "@/lib/admin/settle-action";
import { useToast } from "@/components/ui/toast";

type RunOptions<T> = {
  onSuccess?: (data: T) => void;
  /** Shown as a toast. Leave it out when the control itself shows the change. */
  successMessage?: string;
};

/** Runs admin server actions with a pending flag and an inline error.
 *  Actions revalidate their own paths, so nothing refreshes here. */
export function useAdminAction() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    options: RunOptions<T> = {},
  ): Promise<boolean> {
    setError(null);
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await settleAdminAction(action);
        if (!result.ok) {
          setError(result.error);
          resolve(false);
          return;
        }
        options.onSuccess?.(result.data);
        if (options.successMessage) toast(options.successMessage);
        resolve(true);
      });
    });
  }

  return { run, isPending, error, clearError: () => setError(null) };
}
