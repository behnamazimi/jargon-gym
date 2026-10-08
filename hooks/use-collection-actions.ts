"use client";

import { useActionRunner } from "@/hooks/use-action-runner";
import {
  addToCollection,
  createEmptyCollection,
  deleteOwnedCollection,
  removeFromCollection,
  resetCollectionProgress,
  shareCollection,
  updateOwnedCollection,
  unshareCollection,
} from "@/app/(private)/app/actions";
import type { CollectionInput, NewCollectionInput } from "@/lib/library/collection-schema";

export function useCollectionActions() {
  const { run, error, busyId, isBusy, clearError } = useActionRunner();

  return {
    error,
    isBusy,
    busyId,
    clearError,
    shareCollection: (collectionId: string) =>
      run(() => shareCollection(collectionId), { busyKey: collectionId }),
    unshareCollection: (collectionId: string) =>
      run(() => unshareCollection(collectionId), { busyKey: collectionId }),
    updateOwnedCollection: (collectionId: string, input: CollectionInput, onSuccess?: () => void) =>
      run(() => updateOwnedCollection(collectionId, input), { busyKey: collectionId, onSuccess }),
    createEmptyCollection: (
      input: NewCollectionInput,
      onSuccess?: (collectionId: string) => void,
    ) => {
      let createdId: string | undefined;
      return run(
        async () => {
          const result = await createEmptyCollection(input);
          createdId = result.collectionId;
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
    deleteOwnedCollection: (collectionId: string, onSuccess?: () => void) =>
      run(() => deleteOwnedCollection(collectionId), { busyKey: collectionId, onSuccess }),
    removeFromCollection: (collectionId: string, onSuccess?: () => void) =>
      run(() => removeFromCollection(collectionId), {
        busyKey: collectionId,
        onSuccess,
        skipRefresh: true,
      }),
    addToCollection: (collectionId: string) =>
      run(() => addToCollection(collectionId), { busyKey: collectionId, skipRefresh: true }),
    resetProgress: (collectionId: string, onSuccess?: () => void) =>
      run(() => resetCollectionProgress(collectionId), { busyKey: collectionId, onSuccess }),
  };
}
