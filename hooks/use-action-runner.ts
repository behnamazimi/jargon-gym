"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

export function useActionRunner() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = useCallback(
    async (
      action: () => Promise<{ error?: string }>,
      options?: { onSuccess?: () => void; busyKey?: string },
    ) => {
      setBusyId(options?.busyKey ?? "global");
      setError(null);

      const result = await action();

      setBusyId(null);

      if (result.error) {
        setError(result.error);
        return false;
      }

      options?.onSuccess?.();
      router.refresh();
      return true;
    },
    [router],
  );

  const clearError = useCallback(() => setError(null), []);

  return { run, error, busyId, isBusy: busyId !== null, clearError };
}
