"use client";

import { track } from "@/lib/analytics/track";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CaptureDuplicateNote } from "@/components/capture/capture-duplicate-note";
import { CaptureActions } from "@/components/capture/capture-actions";
import { CaptureDetails } from "@/components/capture/capture-details";
import { CaptureSaved } from "@/components/capture/capture-saved";
import { useCaptureDetails } from "@/components/capture/use-capture-details";
import { SharedSentenceChips } from "@/components/capture/shared-sentence-chips";
import { FirstCollectionForm } from "@/components/capture/first-collection-form";
import { CollectionSelect } from "@/components/library/collection-select";
import { PastedListPrompt } from "@/components/import/pasted-list-prompt";
import { PanelSkeleton } from "@/components/page-skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useCaptureDuplicate } from "@/hooks/use-capture-duplicate";
import { useCaptureTerms } from "@/hooks/use-capture-terms";
import { useTermActions } from "@/hooks/use-term-actions";
import { CAPTURE_COPY } from "@/lib/capture/copy";
import { pickDestination } from "@/lib/capture/destination";
import { loadDestinationPref, saveDestinationPref } from "@/lib/capture/destination-pref";
import { toggleChip, termFromSelection, type Selection } from "@/lib/capture/selection";
import { initialFromShared, type SharedIntake } from "@/lib/capture/shared-input";
import { tokenize } from "@/lib/capture/tokenize";
import { writeDraft } from "@/lib/import/draft-store";
import type { ImportDestination } from "@/lib/import/import-collections";
import { classifyTermPaste } from "@/lib/import/term-paste";

type Saved = { term: string; unfinished: boolean; collectionId: string; collectionName: string };

/** Waits for hydration so the remembered collection (read from this device)
 *  never differs from what the server rendered. */
export function CaptureFlow(props: CaptureFlowProps) {
  return useHydrated() ? <CaptureForm key={props.presetId ?? ""} {...props} /> : <PanelSkeleton />;
}

type CaptureFlowProps = {
  collections: ImportDestination[];
  presetId: string | null;
  shared?: SharedIntake;
};

function CaptureForm({ collections, presetId, shared = { kind: "none" } }: CaptureFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { createTerm, isBusy, error } = useTermActions();
  const { match, check } = useCaptureDuplicate();
  const termRef = useRef<HTMLInputElement>(null);
  const [destinationId, setDestinationId] = useState(() =>
    pickDestination({ preset: presetId, stored: loadDestinationPref(), collections }),
  );
  const initial = useMemo(() => initialFromShared(shared), [shared]);
  const [term, setTerm] = useState(initial.term);
  const [definition, setDefinition] = useState(initial.definition);
  const sentence = initial.sentence;
  const tokens = useMemo(() => (sentence ? tokenize(sentence) : []), [sentence]);
  const { load: loadTerms, termsFor } = useCaptureTerms();
  const extra = useCaptureDetails(sentence);
  const [selection, setSelection] = useState<Selection>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [pastedLines, setPastedLines] = useState<string[] | null>(initial.lines);
  const pasteSource = shared.kind === "lines" ? "shared" : "pasted";

  const destination = collections.find((collection) => collection.id === destinationId);
  useMountEffect(() => {
    check(destinationId, initial.term);
    if (destinationId) void loadTerms(destinationId);
  });

  if (!destination) return <FirstCollectionForm />;

  const canSave = term.trim().length > 0 && !match && !isBusy;

  function changeTerm(value: string) {
    setTerm(value);
    check(destination?.id ?? null, value);
  }

  function changeDestination(id: string) {
    setDestinationId(id);
    extra.changeCollection();
    check(id, term);
    void loadTerms(id);
  }

  const destinationTerms = termsFor(destination.id);
  function toggleWord(index: number) {
    if (!sentence) return;
    const next = toggleChip(selection, index);
    setSelection(next);
    changeTerm(termFromSelection(sentence, tokens, next));
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
    router.push(`/app/import/paste?to=${destination?.id}&from=term`);
  }

  function reset() {
    setTerm("");
    setDefinition("");
    setSelection(null);
    setPastedLines(null);
    setSaved(null);
    extra.reset();
    check(null, "");
  }

  async function save(addAnother: boolean) {
    if (!canSave || !destination) return;
    const name = term.trim();
    const unfinished = !definition.trim();

    const prepared = extra.prepare({ term: name, definition }, destinationTerms);
    if (!prepared) return;

    // Focus before the request so the phone keyboard stays up between saves.
    if (addAnother) termRef.current?.focus();

    const ok = await createTerm(destination.id, prepared.payload, {
      create: prepared.relationships,
    });
    if (!ok) return;
    track("term_created", { has_definition: !unfinished });
    saveDestinationPref(destination.id);
    void loadTerms(destination.id);

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
    setSaved({
      term: name,
      unfinished,
      collectionId: destination.id,
      collectionName: destination.name,
    });
  }

  if (saved) {
    return (
      <CaptureSaved
        term={saved.term}
        unfinished={saved.unfinished}
        collectionName={saved.collectionName}
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
      className="shadow-surface space-y-4 rounded-box bg-base-100 p-5"
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

      {sentence ? (
        <SharedSentenceChips
          tokens={tokens}
          selection={selection}
          term={term.trim()}
          onToggle={toggleWord}
        />
      ) : null}

      {pastedLines ? (
        <PastedListPrompt
          source={pasteSource}
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
        <p className="m-0 mt-1 text-xs text-base-content/70">{CAPTURE_COPY.definitionHint}</p>
      </Field>

      <CaptureDetails
        form={{ term, definition, ...extra.form }}
        onFieldChange={extra.updateField}
        open={extra.open}
        onOpenChange={extra.setOpen}
        terms={destinationTerms}
        drafts={extra.drafts}
        onDraftsChange={extra.setDrafts}
      />

      {(extra.error ?? error) ? (
        <Alert variant="destructive">
          <AlertDescription>{extra.error ?? error}</AlertDescription>
        </Alert>
      ) : null}

      <CaptureActions canSave={canSave} isBusy={isBusy} onSaveAnother={() => void save(true)} />
    </form>
  );
}
