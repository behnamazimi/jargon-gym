"use client";

import { track } from "@/lib/analytics/track";
import { useReducer, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { checkImportAgainstDestination } from "@/app/(private)/app/import/actions";
import {
  activeDrafts,
  checkReducer,
  initialCheckState,
  summarize,
  termKey,
  type DestinationMatch,
} from "@/lib/import/check-state";
import {
  canCommit,
  initialDestination,
  jsonDestination,
  submitTerms,
  type DestinationMode,
  type ImportAdapter,
} from "@/components/import/import-flow-helpers";
import { checkActions } from "@/components/import/use-check-actions";
import type { CommitImportInput } from "@/lib/import/commit-schema";
import { personalDraft } from "@/lib/import/draft-store";
import type { ImportDestination } from "@/lib/import/import-collections";
import type { JsonImport } from "@/lib/import/json-input";
import { guessScriptLanguage } from "@/lib/import/parse/script-hint";
import { readLanguagePref, writeLanguagePref } from "@/lib/import/language-pref";
import { buildTerms } from "@/lib/import/parse/build-terms";
import { parseList } from "@/lib/import/parse/detect";
import type { BuiltTerms, ImportFormat, ParseOptions, ParsedList } from "@/lib/import/parse/types";
import { readImportInput, type PasteProblem } from "@/lib/import/read-input";
import { findSimilarName } from "@/lib/import/similar-name";
import type { ImportFailure } from "@/lib/import/types";
import type { CollectionLanguage } from "@/lib/terms/languages";

export type { DestinationMode };
export type CardFilter = "all" | "attention" | "there";

type FlowArgs = {
  collections: ImportDestination[];
  presetCollectionId?: string;
  entry: CommitImportInput["entry"];
  adapter?: ImportAdapter;
};

const newImportId = () => crypto.randomUUID();

/** All of the paste, check and add state for one trip through the importer. */
export function useImportFlow({ collections, presetCollectionId, entry, adapter }: FlowArgs) {
  const store = adapter?.draftStore ?? personalDraft;
  const draft = useSyncExternalStore(store.subscribe, store.read, () => "");
  const [step, setStep] = useState<"paste" | "check">("paste");
  const [html, setHtml] = useState<string | undefined>();
  const [problem, setProblem] = useState<PasteProblem | null>(null);
  const [options, setOptions] = useState<ParseOptions>({});
  const [parsed, setParsed] = useState<ParsedList | null>(null);
  const [built, setBuilt] = useState<BuiltTerms | null>(null);
  const [json, setJson] = useState<JsonImport | null>(null);
  const [resolved, setResolved] = useState<string[]>([]);
  const [check, dispatch] = useReducer(checkReducer, undefined, () =>
    initialCheckState(newImportId()),
  );

  const preset = collections.find((collection) => collection.id === presetCollectionId);
  const [start] = useState(() => initialDestination(adapter, preset, collections));
  const [mode, setMode] = useState<DestinationMode>(start.mode);
  const [newName, setNewName] = useState(start.name);
  const [language, setLanguage] = useState<CollectionLanguage>(start.language);
  const [existingId, setExistingId] = useState(start.existingId);
  const [filter, setFilter] = useState<CardFilter>("all");
  const [reviewAll, setReviewAll] = useState(false);
  const [lastRemoved, setLastRemoved] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [isCommitting, startCommit] = useTransition();
  const matchRequest = useRef(0);

  const existing = collections.find((collection) => collection.id === existingId);
  const similar =
    mode === "new"
      ? findSimilarName(
          newName,
          collections.map((c) => c.name),
        )
      : null;

  async function refreshMatches(collectionId: string | null, names: string[]) {
    const request = ++matchRequest.current;
    if (adapter || !collectionId || names.length === 0) {
      dispatch({ type: "setMatches", matches: {} });
      return;
    }
    setChecking(true);
    const result = await checkImportAgainstDestination({ collectionId, terms: names });
    if (request !== matchRequest.current) return;
    setChecking(false);
    if ("error" in result) {
      setFailure({ title: "Couldn't check", message: result.error });
      return;
    }
    const matches: Record<string, DestinationMatch> = {};
    for (const match of result.matches) matches[termKey(match.name)] = match;
    dispatch({ type: "setMatches", matches });
  }

  function loadTerms(nextBuilt: BuiltTerms, collectionId: string | null) {
    setBuilt(nextBuilt);
    setResolved([]);
    dispatch({ type: "load", drafts: nextBuilt.terms, importId: newImportId() });
    void refreshMatches(
      collectionId,
      nextBuilt.terms.map((term) => term.term),
    );
  }

  /** Reads the text and moves to Check, or says what's wrong. */
  function checkText(text: string, nextHtml: string | undefined, nextOptions = options) {
    setFailure(null);
    setProblem(null);
    setOptions(nextOptions);
    setHtml(nextHtml);

    const result = readImportInput(text, { ...nextOptions, html: nextHtml });
    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    let collectionId = mode === "existing" ? existingId : (preset?.id ?? null);
    if (result.kind === "json") {
      setJson(result.json);
      setParsed(null);
      const target = adapter ? null : jsonDestination(result.json, collections);
      if (target) {
        setNewName(target.name);
        setLanguage(target.language);
      }
      if (target?.owned) {
        setMode("existing");
        setExistingId(target.owned.id);
        collectionId = target.owned.id;
      }
    } else {
      setJson(null);
      setParsed(result.parsed);
      if (step === "paste" && !adapter) {
        setLanguage(
          guessScriptLanguage(result.built.terms.map((term) => term.term)) ?? readLanguagePref(),
        );
      }
    }

    setStep("check");
    loadTerms(result.built, collectionId);
  }

  function changeOptions(patch: Partial<ParseOptions>) {
    if (json) return;
    const next = { ...options, ...patch };
    const list = parseList(draft, { ...next, html });
    setOptions(next);
    setParsed(list);
    loadTerms(buildTerms(list), mode === "existing" ? existingId : null);
  }

  function setDestination(nextMode: DestinationMode, nextExistingId = existingId) {
    setMode(nextMode);
    setExistingId(nextExistingId);
    dispatch({ type: "setPolicy", policy: check.policy, importId: newImportId() });
    void refreshMatches(
      nextMode === "existing" ? nextExistingId : null,
      activeDrafts(check).map((d) => d.term),
    );
  }

  function editCard(
    id: string,
    patch: { term: string; definition: string | null; category: string | null },
  ) {
    dispatch({ type: "edit", id, patch, importId: newImportId() });
    const names = activeDrafts(check).map((d) => (d.id === id ? patch.term : d.term));
    void refreshMatches(mode === "existing" ? existingId : null, names);
  }

  const summary = summarize(check);
  const nameOk = newName.trim().length > 0 && similar?.kind !== "exact";
  const canAdd = canCommit({
    summary,
    checking,
    adapter,
    mode,
    hasExisting: Boolean(existing),
    nameOk,
  });

  function commit() {
    if (!canAdd) return;
    setFailure(null);

    const format: ImportFormat = json ? "json" : (parsed?.format ?? "lines");
    const destination =
      mode === "existing" && existing
        ? { collectionId: existing.id }
        : { name: newName.trim(), language };
    if (mode === "new" && !adapter) writeLanguagePref(language);
    track("import_submitted", {
      source: json ? "json" : "paste",
      format,
      destination_mode: mode,
      term_count: summary.toAdd,
    });

    startCommit(async () => {
      const failed = await submitTerms({
        adapter,
        check,
        json,
        format,
        destination,
        entry,
        onHandedOver: store.clear,
      });
      if (failed) setFailure(failed);
    });
  }

  return {
    step,
    draft,
    html,
    problem,
    options,
    parsed,
    built,
    json,
    resolved,
    check,
    collections,
    mode,
    newName,
    language,
    existingId,
    existing,
    filter,
    reviewAll,
    lastRemoved,
    checking,
    failure,
    isCommitting,
    summary,
    canAdd,
    adapter,
    setDraftText: (text: string) => store.write(text),
    clearProblem: () => setProblem(null),
    setProblem,
    checkText,
    changeOptions,
    setDestination,
    setNewName,
    setLanguage,
    setFilter,
    setReviewAll,
    ...checkActions({ dispatch, setLastRemoved, setResolved, newImportId }),
    editCard,
    commit,
    backToPaste: () => {
      setStep("paste");
      setFailure(null);
    },
  };
}

export type ImportFlowState = ReturnType<typeof useImportFlow>;
