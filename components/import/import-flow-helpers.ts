import { commitImport } from "@/app/(private)/app/import/actions";
import type { CheckState, CheckSummary, CommitTerm } from "@/lib/import/check-state";
import { toCommitTerms } from "@/lib/import/check-state";
import { OFFLINE_FAILURE } from "@/lib/import/commit-errors";
import type { CommitImportInput } from "@/lib/import/commit-schema";
import type { DraftStore } from "@/lib/import/draft-store";
import type { ImportDestination } from "@/lib/import/import-collections";
import type { JsonImport } from "@/lib/import/json-input";
import { readLanguagePref } from "@/lib/import/language-pref";
import type { ImportFormat } from "@/lib/import/parse/types";
import type { ImportFailure } from "@/lib/import/types";
import type { CollectionLanguage } from "@/lib/terms/languages";

export type DestinationMode = "new" | "existing";

/** Lets another screen run the same paste and check flow with its own destination and
 *  commit, such as handing a prepared collection to someone else. */
export type ImportAdapter = {
  draftStore: DraftStore;
  /** A new collection with this name and language; the person can't change either. */
  destination: { name: string; language: CollectionLanguage };
  /** Returns what went wrong, or null once the terms are handed over. */
  commit: (payload: {
    terms: CommitTerm[];
    links: JsonImport["links"];
    format: ImportFormat;
  }) => Promise<ImportFailure | null>;
  commitLabel: (summary: CheckSummary, committing: boolean) => string;
  /** Replaces the "New collection · name" line when the terms go somewhere else. */
  destinationNote?: string;
  requireAllDefinitions: boolean;
  /** Shown while a card still lacks a definition and one is required. */
  unfinishedNote: string;
};

/** Where a file that names its own collection should land. */
export function jsonDestination(json: JsonImport, collections: ImportDestination[]) {
  const name = json.collection.trim().toLowerCase();
  return {
    name: json.collection,
    language: json.language ?? readLanguagePref(),
    owned: collections.find((c) => c.name.trim().toLowerCase() === name) ?? null,
  };
}

export function canCommit(input: {
  summary: CheckSummary;
  checking: boolean;
  adapter: ImportAdapter | undefined;
  mode: DestinationMode;
  hasExisting: boolean;
  nameOk: boolean;
}): boolean {
  const finished = !input.adapter?.requireAllDefinitions || input.summary.toFinish === 0;
  const destinationOk = input.mode === "existing" ? input.hasExisting : input.nameOk;
  return input.summary.toAdd > 0 && !input.checking && finished && destinationOk;
}

type SubmitArgs = {
  adapter: ImportAdapter | undefined;
  check: CheckState;
  json: JsonImport | null;
  format: ImportFormat;
  destination: CommitImportInput["destination"];
  entry: CommitImportInput["entry"];
  onHandedOver: () => void;
};

/** Hands the checked terms over. Returns what went wrong, or null; a person's own
 *  commit redirects on success instead of returning. */
export async function submitTerms(args: SubmitArgs): Promise<ImportFailure | null> {
  if (navigator.onLine === false) return OFFLINE_FAILURE;
  const terms = toCommitTerms(args.check);
  const links = args.json?.links ?? [];
  try {
    if (args.adapter) {
      const failed = await args.adapter.commit({ terms, links, format: args.format });
      if (!failed) args.onHandedOver();
      return failed;
    }
    const result = await commitImport({
      importId: args.check.importId,
      destination: args.destination,
      terms,
      links,
      policy: args.check.policy,
      entry: args.entry,
      source: args.json ? "json" : "paste",
      format: args.format,
    });
    return result.ok ? null : result.failure;
  } catch {
    return OFFLINE_FAILURE;
  }
}

/** Where a flow starts: a collection chosen up front, a fixed one, or a new one. */
export function initialDestination(
  adapter: ImportAdapter | undefined,
  preset: ImportDestination | undefined,
  collections: ImportDestination[],
) {
  return {
    mode: (preset && !adapter ? "existing" : "new") as DestinationMode,
    name: adapter?.destination.name ?? "",
    language: adapter?.destination.language ?? ("en" as CollectionLanguage),
    existingId: preset?.id ?? collections[0]?.id ?? "",
  };
}
