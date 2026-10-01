"use client";

import { useReducer, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { checkImportAgainstDestination, commitImport } from "@/app/(private)/jargon/import/actions";
import {
  activeDrafts,
  checkReducer,
  initialCheckState,
  summarize,
  termKey,
  toCommitTerms,
  type DestinationMatch,
  type DuplicatePolicy,
} from "@/lib/jargon/import/check-state";
import { OFFLINE_FAILURE } from "@/lib/jargon/import/commit-errors";
import type { CommitImportInput } from "@/lib/jargon/import/commit-schema";
import { readDraft, subscribeToDraft, writeDraft } from "@/lib/jargon/import/draft-store";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";
import type { JsonImport } from "@/lib/jargon/import/json-input";
import { readLanguagePref, writeLanguagePref } from "@/lib/jargon/import/language-pref";
import { buildTerms } from "@/lib/jargon/import/parse/build-terms";
import { parseList } from "@/lib/jargon/import/parse/detect";
import type {
  BuiltTerms,
  ImportFormat,
  ParseOptions,
  ParsedList,
} from "@/lib/jargon/import/parse/types";
import { readImportInput, type PasteProblem } from "@/lib/jargon/import/read-input";
import { findSimilarName } from "@/lib/jargon/import/similar-name";
import type { ImportFailure } from "@/lib/jargon/import/types";
import type { DomainLanguage } from "@/lib/jargon/languages";

export type DestinationMode = "new" | "existing";
export type CardFilter = "all" | "attention" | "there";

type FlowArgs = {
  collections: ImportDestination[];
  presetDomainId?: string;
  entry: CommitImportInput["entry"];
};

const newImportId = () => crypto.randomUUID();

/** All of the paste, check and add state for one trip through the importer. */
export function useImportFlow({ collections, presetDomainId, entry }: FlowArgs) {
  const draft = useSyncExternalStore(subscribeToDraft, readDraft, () => "");
  const [step, setStep] = useState<"paste" | "check">("paste");
  const [html, setHtml] = useState<string | undefined>();
  const [problem, setProblem] = useState<PasteProblem | null>(null);
  const [options, setOptions] = useState<ParseOptions>({});
  const [parsed, setParsed] = useState<ParsedList | null>(null);
  const [built, setBuilt] = useState<BuiltTerms | null>(null);
  const [json, setJson] = useState<JsonImport | null>(null);
  const [swap, setSwap] = useState(false);
  const [resolved, setResolved] = useState<string[]>([]);
  const [check, dispatch] = useReducer(checkReducer, undefined, () =>
    initialCheckState(newImportId()),
  );

  const preset = collections.find((collection) => collection.id === presetDomainId);
  const [mode, setMode] = useState<DestinationMode>(preset ? "existing" : "new");
  const [newName, setNewName] = useState("");
  const [language, setLanguage] = useState<DomainLanguage>("en");
  const [existingId, setExistingId] = useState(preset?.id ?? collections[0]?.id ?? "");
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

  async function refreshMatches(domainId: string | null, names: string[]) {
    const request = ++matchRequest.current;
    if (!domainId || names.length === 0) {
      dispatch({ type: "setMatches", matches: {} });
      return;
    }
    setChecking(true);
    const result = await checkImportAgainstDestination({ domainId, terms: names });
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

  function loadTerms(nextBuilt: BuiltTerms, domainId: string | null) {
    setBuilt(nextBuilt);
    setResolved([]);
    dispatch({ type: "load", drafts: nextBuilt.terms, importId: newImportId() });
    void refreshMatches(
      domainId,
      nextBuilt.terms.map((term) => term.term),
    );
  }

  /** Reads the text and moves to Check, or says what's wrong. */
  function checkText(text: string, nextHtml: string | undefined, nextOptions = options) {
    setFailure(null);
    setProblem(null);
    setOptions(nextOptions);
    setHtml(nextHtml);

    const result = readImportInput(text, { ...nextOptions, html: nextHtml }, swap);
    if (!result.ok) {
      setProblem(result.problem);
      return;
    }

    let domainId = mode === "existing" ? existingId : (preset?.id ?? null);
    if (result.kind === "json") {
      const name = result.json.domain.trim().toLowerCase();
      const owned = collections.find((c) => c.name.trim().toLowerCase() === name);
      setJson(result.json);
      setParsed(null);
      setNewName(result.json.domain);
      setLanguage(result.json.language ?? readLanguagePref());
      if (owned) {
        setMode("existing");
        setExistingId(owned.id);
        domainId = owned.id;
      }
    } else {
      setJson(null);
      setParsed(result.parsed);
      if (step === "paste") setLanguage(readLanguagePref());
    }

    setStep("check");
    loadTerms(result.built, domainId);
  }

  function changeOptions(patch: Partial<ParseOptions>, nextSwap = swap) {
    if (json) return;
    const next = { ...options, ...patch };
    const list = parseList(draft, { ...next, html });
    setOptions(next);
    setSwap(nextSwap);
    setParsed(list);
    loadTerms(buildTerms(list, { swap: nextSwap }), mode === "existing" ? existingId : null);
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
  const canAdd =
    summary.toAdd > 0 && !checking && (mode === "existing" ? Boolean(existing) : nameOk);

  function commit() {
    if (!canAdd) return;
    setFailure(null);

    const format: ImportFormat = json ? "json" : (parsed?.format ?? "lines");
    const destination =
      mode === "existing" && existing
        ? { domainId: existing.id }
        : { name: newName.trim(), language };
    if (mode === "new") writeLanguagePref(language);

    startCommit(async () => {
      if (navigator.onLine === false) {
        setFailure(OFFLINE_FAILURE);
        return;
      }
      try {
        const result = await commitImport({
          importId: check.importId,
          destination,
          terms: toCommitTerms(check),
          links: json?.links ?? [],
          policy: check.policy,
          entry,
          source: json ? "json" : "paste",
          format,
        });
        if (!result.ok) setFailure(result.failure);
      } catch {
        setFailure(OFFLINE_FAILURE);
      }
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
    swap,
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
    setDraftText: (text: string) => writeDraft(text),
    clearProblem: () => setProblem(null),
    setProblem,
    checkText,
    changeOptions,
    toggleSwap: () => changeOptions({}, !swap),
    setDestination,
    setNewName,
    setLanguage,
    setFilter,
    setReviewAll,
    removeCard: (id: string) => {
      setLastRemoved(id);
      dispatch({ type: "remove", id, importId: newImportId() });
    },
    restoreCard: (id: string) => {
      setLastRemoved(null);
      dispatch({ type: "restore", id, importId: newImportId() });
    },
    editCard,
    chooseDefinition: (termId: string, definition: string | null) => {
      dispatch({ type: "edit", id: termId, patch: { definition }, importId: newImportId() });
      setResolved((current) => [...current, termId]);
    },
    setPolicy: (policy: DuplicatePolicy) =>
      dispatch({ type: "setPolicy", policy, importId: newImportId() }),
    setOverride: (id: string, policy: DuplicatePolicy | null) =>
      dispatch({ type: "setOverride", id, policy, importId: newImportId() }),
    setCategory: (category: string) =>
      dispatch({ type: "setCategory", category, importId: newImportId() }),
    commit,
    backToPaste: () => {
      setStep("paste");
      setFailure(null);
    },
  };
}

export type ImportFlowState = ReturnType<typeof useImportFlow>;
