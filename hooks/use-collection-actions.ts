"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addToCollection,
  deleteOwnedDomain,
  removeFromCollection,
  resetCollectionProgress,
  shareDomain,
  toggleActiveForReview,
  updateOwnedDomain,
  unshareDomain,
} from "@/app/(private)/jargon/actions";
import type { DomainInput } from "@/lib/jargon/domain-schema";

export function useCollectionActions() {
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

  return {
    error,
    isBusy: busyId !== null,
    busyId,
    clearError: () => setError(null),
    toggleActiveForReview: (domainId: string, active: boolean) =>
      run(() => toggleActiveForReview(domainId, active), { busyKey: domainId }),
    shareDomain: (domainId: string) => run(() => shareDomain(domainId), { busyKey: domainId }),
    unshareDomain: (domainId: string) => run(() => unshareDomain(domainId), { busyKey: domainId }),
    updateOwnedDomain: (domainId: string, input: DomainInput, onSuccess?: () => void) =>
      run(() => updateOwnedDomain(domainId, input), { busyKey: domainId, onSuccess }),
    deleteOwnedDomain: (domainId: string, onSuccess?: () => void) =>
      run(() => deleteOwnedDomain(domainId), { busyKey: domainId, onSuccess }),
    removeFromCollection: (domainId: string, onSuccess?: () => void) =>
      run(() => removeFromCollection(domainId), { busyKey: domainId, onSuccess }),
    addToCollection: (domainId: string) =>
      run(() => addToCollection(domainId), { busyKey: domainId }),
    resetProgress: (domainId: string, onSuccess?: () => void) =>
      run(() => resetCollectionProgress(domainId), { busyKey: domainId, onSuccess }),
  };
}
