"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { CaptureDuplicateNote } from "@/components/jargon/capture/capture-duplicate-note";
import { CaptureSaved } from "@/components/jargon/capture/capture-saved";
import { FirstCollectionForm } from "@/components/jargon/capture/first-collection-form";
import { CollectionSelect } from "@/components/jargon/collection-select";
import { PastedListPrompt } from "@/components/jargon/pasted-list-prompt";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useCaptureDuplicate } from "@/hooks/use-capture-duplicate";
import { useTermActions } from "@/hooks/use-term-actions";
import { CAPTURE_COPY } from "@/lib/jargon/capture/copy";
import { pickDestination } from "@/lib/jargon/capture/destination";
import {
  loadDestinationPref,
  saveDestinationPref,
  subscribeDestinationPref,
} from "@/lib/jargon/capture/destination-pref";
import { writeDraft } from "@/lib/jargon/import/draft-store";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";
import { classifyTermPaste } from "@/lib/jargon/import/term-paste";

type Saved = { term: string; unfinished: boolean; collectionId: string };

export function CaptureFlow({
  collections,
  presetId,
}: {
  collections: ImportDestination[];
  presetId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { createTerm, isBusy, error } = useTermActions();
  const { match, check } = useCaptureDuplicate();
  const termRef = useRef<HTMLInputElement>(null);
  const stored = useSyncExternalStore(subscribeDestinationPref, loadDestinationPref, () => null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [definition, setDefinition] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [pastedLines, setPastedLines] = useState<string[] | null>(null);

  const destinationId = pickDestination({ preset: chosenId ?? presetId, stored, collections });
  const destination = collections.find((collection) => collection.id === destinationId);

  if (!destination) return <FirstCollectionForm />;

  const canSave = term.trim().length > 0 && !match && !isBusy;

  function changeTerm(value: string) {
    setTerm(value);
    check(destination?.id ?? null, value);
  }

  function changeDestination(id: string) {
    setChosenId(id);
    check(id, term);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = classifyTermPaste(event.clipboardData.getData("text/plain"));
    if (pasted.kind === "single") return;
    event.preventDefault();
    if (pasted.kind === "term-and-definition") {
      changeTerm(pasted.term);
      setDefinition(pasted.definition);
      return;
    }
    setPastedLines(pasted.lines);
  }

  function addPastedAsList(lines: string[]) {
    writeDraft(lines.join("\n"));
    router.push(`/jargon/import/paste?to=${destination?.id}&from=term`);
  }

  function reset() {
    setTerm("");
    setDefinition("");
    setSaved(null);
    check(null, "");
  }

  async function save(addAnother: boolean) {
    if (!canSave || !destination) return;
    const name = term.trim();
    const unfinished = !definition.trim();
    // Focus before the request so the phone keyboard stays up between saves.
    if (addAnother) termRef.current?.focus();

    const ok = await createTerm(destination.id, { term: name, definition });
    if (!ok) return;
    saveDestinationPref(destination.id);

    if (addAnother) {
      toast(
        unfinished
          ? CAPTURE_COPY.savedUnfinished(name, destination.name)
          : CAPTURE_COPY.saved(name, destination.name),
        "success",
      );
      reset();
      return;
    }
    setSaved({ term: name, unfinished, collectionId: destination.id });
  }

  if (saved) {
    return (
      <CaptureSaved
        term={saved.term}
        unfinished={saved.unfinished}
        collectionName={destination.name}
        collectionId={saved.collectionId}
        onAddAnother={reset}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save(false);
      }}
      className="space-y-4"
    >
      <Field>
        <FieldLabel htmlFor="capture-collection">{CAPTURE_COPY.collection}</FieldLabel>
        <CollectionSelect
          mode="local"
          id="capture-collection"
          aria-label={CAPTURE_COPY.collection}
          collections={collections.map(({ id, name }) => ({ id, name }))}
          value={destination.id}
          className="w-full"
          onChange={changeDestination}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="capture-term">{CAPTURE_COPY.term}</FieldLabel>
        <Input
          id="capture-term"
          ref={termRef}
          value={term}
          autoFocus
          className="text-base"
          placeholder={CAPTURE_COPY.termPlaceholder}
          onChange={(event) => changeTerm(event.target.value)}
          onPaste={handlePaste}
        />
      </Field>

      {pastedLines ? (
        <PastedListPrompt
          lines={pastedLines}
          onAddAsList={() => addPastedAsList(pastedLines)}
          onKeepAsOne={() => {
            changeTerm(pastedLines.join(" "));
            setPastedLines(null);
          }}
        />
      ) : null}

      {match ? (
        <CaptureDuplicateNote
          term={match.term}
          finished={match.finished}
          collectionName={destination.name}
          collectionId={destination.id}
        />
      ) : null}

      <Field>
        <FieldLabel htmlFor="capture-definition">{CAPTURE_COPY.definition}</FieldLabel>
        <Textarea
          id="capture-definition"
          value={definition}
          className="min-h-20 text-base"
          placeholder={CAPTURE_COPY.definitionPlaceholder}
          onChange={(event) => setDefinition(event.target.value)}
        />
        <p className="m-0 mt-1 text-xs text-base-content/60">{CAPTURE_COPY.definitionHint}</p>
      </Field>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="submit" className="min-h-12 w-full" isDisabled={!canSave}>
          {isBusy ? CAPTURE_COPY.saving : CAPTURE_COPY.save}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          isDisabled={!canSave}
          onPress={() => void save(true)}
        >
          {CAPTURE_COPY.saveAnother}
        </Button>
      </div>
    </form>
  );
}
