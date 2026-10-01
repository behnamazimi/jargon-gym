"use client";

import { useState } from "react";
import { deliverRequest } from "@/app/(private)/admin/requests/delivery-actions";
import { ImportFlow } from "@/components/jargon/import/import-flow";
import type { ImportAdapter } from "@/components/jargon/import/import-flow-helpers";
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
import type { CheckSummary, CommitTerm } from "@/lib/jargon/import/check-state";
import { createDraftStore } from "@/lib/jargon/import/draft-store";
import type { ImportFormat } from "@/lib/jargon/import/parse/types";
import type { ImportFailure } from "@/lib/jargon/import/types";
import type { DomainLanguage } from "@/lib/jargon/languages";
import { settleAdminAction } from "@/lib/admin/settle-action";
import { pluralize } from "@/lib/utils";

type Pending = {
  terms: CommitTerm[];
  links: Parameters<ImportAdapter["commit"]>[0]["links"];
  format: ImportFormat;
  resolve: (failure: ImportFailure | null) => void;
};

const NOT_DELIVERED: ImportFailure = {
  title: "Not delivered",
  message: "Nothing was delivered. Your list is still here.",
};

export function FulfilPanel({
  requestId,
  topic,
  language,
  people,
  knownTerms,
}: {
  requestId: string;
  topic: string;
  language: DomainLanguage;
  /** Everyone who gets their own copy: the requester and the requests merged into this one. */
  people: number;
  knownTerms: string | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(topic);
  const [store] = useState(() =>
    createDraftStore(`jargon-gym:import-draft:v1:request:${requestId}`),
  );
  const [pending, setPending] = useState<Pending | null>(null);
  const [delivering, setDelivering] = useState(false);

  const adapter: ImportAdapter = {
    draftStore: store,
    destination: { name: name.trim() || topic, language },
    commit: (payload) => new Promise((resolve) => setPending({ ...payload, resolve })),
    commitLabel: (summary: CheckSummary, committing) =>
      committing ? "Delivering…" : `Deliver ${pluralize(summary.toAdd, "term")}`,
    requireAllDefinitions: true,
    unfinishedNote: "Every term needs a definition before it can be delivered.",
  };

  async function deliver(request: Pending) {
    setDelivering(true);
    const result = await settleAdminAction(() =>
      deliverRequest({
        requestId,
        name: adapter.destination.name,
        terms: request.terms,
        links: request.links,
        format: request.format,
      }),
    );
    setDelivering(false);
    setPending(null);

    if (!result.ok) {
      request.resolve({ title: "Couldn't deliver", message: result.error });
      return;
    }
    const failed = result.data.emailFailed;
    toast(
      `Delivered to ${pluralize(result.data.delivered, "person", "people")}${failed > 0 ? `. ${failed} email${failed === 1 ? "" : "s"} failed: use Resend.` : "."}`,
      failed > 0 ? "destructive" : "success",
    );
    request.resolve(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Collection name</span>
        <input
          className="input input-bordered w-full max-w-md"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
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
          <AlertDialogTitle>Deliver “{adapter.destination.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {pluralize(pending?.terms.length ?? 0, "term")} go to{" "}
            {pluralize(people, "person", "people")}. Each gets their own private copy, and it can't
            be taken back from here.
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
          <AlertDialogAction
            isDisabled={delivering}
            onPress={() => pending && void deliver(pending)}
          >
            {delivering ? "Delivering…" : "Deliver"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  );
}
