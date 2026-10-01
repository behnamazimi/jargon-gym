"use client";

import { useActionRunner } from "@/hooks/use-action-runner";
import {
  addToCollection,
  createEmptyCollection,
  deleteOwnedDomain,
  removeFromCollection,
  resetCollectionProgress,
  shareDomain,
  updateOwnedDomain,
  unshareDomain,
} from "@/app/(private)/jargon/actions";
import type { DomainInput, NewCollectionInput } from "@/lib/jargon/domain-schema";

export function useCollectionActions() {
  const { run, error, busyId, isBusy, clearError } = useActionRunner();

  return {
    error,
    isBusy,
    busyId,
    clearError,
    shareDomain: (domainId: string) => run(() => shareDomain(domainId), { busyKey: domainId }),
    unshareDomain: (domainId: string) => run(() => unshareDomain(domainId), { busyKey: domainId }),
    updateOwnedDomain: (domainId: string, input: DomainInput, onSuccess?: () => void) =>
      run(() => updateOwnedDomain(domainId, input), { busyKey: domainId, onSuccess }),
    createEmptyCollection: (input: NewCollectionInput, onSuccess?: (domainId: string) => void) => {
      let createdId: string | undefined;
      return run(
        async () => {
          const result = await createEmptyCollection(input);
          createdId = result.domainId;
          return result;
        },
        {
          busyKey: "new-collection",
          skipRefresh: true,
          onSuccess: () => {
            if (createdId) onSuccess?.(createdId);
          },
        },
      );
    },
    deleteOwnedDomain: (domainId: string, onSuccess?: () => void) =>
      run(() => deleteOwnedDomain(domainId), { busyKey: domainId, onSuccess }),
    removeFromCollection: (domainId: string, onSuccess?: () => void) =>
      run(() => removeFromCollection(domainId), {
        busyKey: domainId,
        onSuccess,
        skipRefresh: true,
      }),
    addToCollection: (domainId: string) =>
      run(() => addToCollection(domainId), { busyKey: domainId, skipRefresh: true }),
    resetProgress: (domainId: string, onSuccess?: () => void) =>
      run(() => resetCollectionProgress(domainId), { busyKey: domainId, onSuccess }),
  };
}
