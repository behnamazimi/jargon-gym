"use client";

import { useActionRunner } from "@/hooks/use-action-runner";
import { createTerm, deleteTerm, updateTerm } from "@/app/(private)/jargon/actions";
import type { RelationshipSyncPayload } from "@/lib/jargon/relationship-schema";
import type { TermInput } from "@/lib/jargon/term-schema";

export function useTermActions() {
  const { run, error, busyId, isBusy, clearError } = useActionRunner();

  return {
    error,
    isBusy,
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
