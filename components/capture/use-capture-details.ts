"use client";

import { useState } from "react";
import { buildTermPayload, emptyDetails } from "@/components/terms/term-form-dialog-helpers";
import type { CaptureTerm } from "@/app/(private)/jargon/capture/actions";
import type { RelationshipDraft } from "@/lib/terms/relationship-schema";
import { buildRelationshipSync, validateRelationshipDrafts } from "@/lib/terms/relationship-sync";
import { mostUsedCategory } from "@/lib/terms/term-duplicates";
import type { TermFormValues } from "@/lib/terms/term-schema";

/** The optional fields of a captured term: category, the detail texts and
 *  links to other terms. The example stays after saving, so another word from
 *  the same sentence keeps it. */
export function useCaptureDetails(sentence: string | null) {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState({ ...emptyDetails, example: sentence ?? "" });
  const [drafts, setDrafts] = useState<RelationshipDraft[]>([]);
  const [open, setOpen] = useState(Boolean(sentence));
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof TermFormValues>(key: K, value: TermFormValues[K]) {
    if (key === "category") setCategory(String(value ?? ""));
    else setDetails((prev) => ({ ...prev, [key]: String(value ?? "") }));
  }

  /** Links point at terms of one collection, so a new pick starts them over. */
  function changeCollection() {
    setCategory("");
    setDrafts([]);
  }

  function reset() {
    setDetails({ ...emptyDetails, example: sentence ?? "" });
    setDrafts([]);
    setError(null);
  }

  /** The text to save, or null (with the error shown) when the links are off. */
  function prepare(base: Pick<TermFormValues, "term" | "definition">, existing: CaptureTerm[]) {
    const invalid = validateRelationshipDrafts(drafts, undefined);
    if (invalid) {
      setOpen(true);
      setError(invalid);
      return null;
    }
    setError(null);
    return {
      payload: buildTermPayload({
        ...base,
        ...details,
        category: category.trim() || mostUsedCategory(existing),
      }),
      relationships: buildRelationshipSync([], drafts).create,
    };
  }

  return {
    form: { category, ...details },
    open,
    setOpen,
    drafts,
    setDrafts,
    error,
    updateField,
    changeCollection,
    reset,
    prepare,
  };
}
