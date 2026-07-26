"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createTerm, deleteTerm, updateTerm } from "@/app/(private)/jargon/actions";
import type { RelationshipSyncPayload } from "@/lib/jargon/relationship-schema";
import type { TermInput } from "@/lib/jargon/term-schema";

export function useTermActions() {
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

  return {
    error,
    isBusy: busyId !== null,
    busyId,
    clearError,
    createTerm: (
      domainId: string,
      input: TermInput,
      relationshipSync?: Pick<RelationshipSyncPayload, "create">,
      onSuccess?: () => void,
    ) =>
      run(() => createTerm(domainId, input, relationshipSync), {
        busyKey: domainId,
        onSuccess,
      }),
    updateTerm: (
      termId: string,
      input: TermInput,
      relationshipSync?: RelationshipSyncPayload,
      onSuccess?: () => void,
    ) => run(() => updateTerm(termId, input, relationshipSync), { busyKey: termId, onSuccess }),
    deleteTerm: (termId: string, onSuccess?: () => void) =>
      run(() => deleteTerm(termId), { busyKey: termId, onSuccess }),
  };
}
