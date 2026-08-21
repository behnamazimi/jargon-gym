"use client";

import { useActionRunner } from "@/hooks/use-action-runner";
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
  const { run, error, busyId, isBusy, clearError } = useActionRunner();

  return {
    error,
    isBusy,
    busyId,
    clearError,
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
