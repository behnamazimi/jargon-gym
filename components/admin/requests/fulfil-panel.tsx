"use client";

import { useState } from "react";
import { deliverRequest, fillDefinitions } from "@/app/(private)/admin/requests/delivery-actions";
import { ImportFlow } from "@/components/import/import-flow";
import type { ImportAdapter } from "@/components/import/import-flow-helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/admin/action";
import { settleAdminAction } from "@/lib/admin/settle-action";
import { createDraftStore } from "@/lib/import/draft-store";
import type { ImportFailure } from "@/lib/import/types";
import type { DomainLanguage } from "@/lib/terms/languages";
import { pluralize } from "@/lib/utils";

type Payload = Parameters<ImportAdapter["commit"]>[0];
type Pending = Payload & { resolve: (failure: ImportFailure | null) => void };
type Handover = { delivered: number; emailFailed: number };

const NOT_DELIVERED: ImportFailure = {
  title: "Not delivered",
  message: "Nothing was delivered. Your list is still here.",
};

function doneMessage({ delivered, emailFailed }: Handover): string {
  const sent = `Delivered to ${pluralize(delivered, "person", "people")}.`;
  return emailFailed > 0
    ? `${sent} ${emailFailed} email${emailFailed === 1 ? "" : "s"} failed: use Resend.`
    : sent;
}

type FulfilPanelProps = {
  requestId: string;
  topic: string;
  language: DomainLanguage;
  /** Everyone who gets their own copy: the requester and the requests merged into this one. */
  people: number;
  knownTerms: string | null;
  /** Set for a request for definitions: the words waiting in the requester's own collection. */
  waitingWords?: string[];
};

export function FulfilPanel({
  requestId,
  topic,
  language,
  people,
  knownTerms,
  waitingWords,
}: FulfilPanelProps) {
  const { toast } = useToast();
  const [name, setName] = useState(topic);
  const [store] = useState(() =>
    createDraftStore(`jargon-gym:import-draft:v1:request:${requestId}`),
  );
  const [pending, setPending] = useState<Pending | null>(null);
  const [delivering, setDelivering] = useState(false);
  const forDefinitions = waitingWords !== undefined;
  const collectionName = name.trim() || topic;

  const adapter: ImportAdapter = {
    draftStore: store,
    destination: { name: collectionName, language },
    destinationNote: forDefinitions ? `Definitions for the words waiting in “${topic}”` : undefined,
    commit: (payload) => new Promise((resolve) => setPending({ ...payload, resolve })),
    commitLabel: (summary, committing) => {
      if (committing) return forDefinitions ? "Filling in…" : "Delivering…";
      return forDefinitions
        ? `Fill in ${pluralize(summary.toAdd, "definition")}`
        : `Deliver ${pluralize(summary.toAdd, "term")}`;
    },
    requireAllDefinitions: true,
    unfinishedNote: "Every term needs a definition before it can be handed over.",
  };

  async function hand(request: Pending) {
    setDelivering(true);
    const run = (): Promise<ActionResult<Handover>> =>
      forDefinitions
        ? fillDefinitions({ requestId, terms: request.terms })
        : deliverRequest({
            requestId,
            name: collectionName,
            terms: request.terms,
            links: request.links,
            format: request.format,
          });
    const result = await settleAdminAction(run);
    setDelivering(false);
    setPending(null);

    if (!result.ok) {
      request.resolve({ title: "Couldn't hand it over", message: result.error });
      return;
    }
    toast(doneMessage(result.data), result.data.emailFailed > 0 ? "destructive" : "success");
    request.resolve(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {forDefinitions ? (
        <details className="rounded-lg border border-base-300 px-3 py-2 text-sm" open>
          <summary className="cursor-pointer font-medium">
            {pluralize(waitingWords.length, "word")} waiting for a definition
          </summary>
          <p className="mt-2 mb-0">{waitingWords.join(", ")}</p>
        </details>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Collection name</span>
          <input
            className="input input-bordered w-full max-w-md"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}
      {knownTerms ? (
        <details className="rounded-lg border border-base-300 px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">Terms they've come across</summary>
          <p className="mt-2 mb-0 whitespace-pre-line">{knownTerms}</p>
        </details>
      ) : null}

      <ImportFlow collections={[]} addedNames={[]} entry="chooser" adapter={adapter} />

      <AlertDialog
        isOpen={pending !== null}
        onOpenChange={() => undefined}
        isDismissable={false}
        isKeyboardDismissDisabled
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {forDefinitions ? "Fill in these definitions?" : `Deliver “${collectionName}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {forDefinitions
              ? "They go into the words the requester saved. Words that already have a definition, and words they don't have, are skipped."
              : `${pluralize(pending?.terms.length ?? 0, "term")} go to ${pluralize(people, "person", "people")}. Each gets their own private copy, and it can't be taken back from here.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            isDisabled={delivering}
            onPress={() => {
              pending?.resolve(NOT_DELIVERED);
              setPending(null);
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction isDisabled={delivering} onPress={() => pending && void hand(pending)}>
            {delivering ? "Working…" : forDefinitions ? "Fill in" : "Deliver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
