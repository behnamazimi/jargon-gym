"use client";

import { useActionRunner } from "@/hooks/use-action-runner";
import { createTerm, deleteTerm, finishTerm, updateTerm } from "@/app/(private)/jargon/actions";
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
    finishTerm: (
      termId: string,
      input: { definition: string; category?: string | null },
      onSuccess?: () => void,
    ) =>
      run(() => finishTerm(termId, input), {
        busyKey: termId,
        onSuccess,
        skipRefresh: true,
      }),
    deleteTerm: (termId: string) =>
      run(() => deleteTerm(termId), { busyKey: termId, skipRefresh: true }),
  };
}
