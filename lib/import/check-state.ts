import type { DraftTerm } from "./parse/types";

export type DuplicatePolicy = "skip" | "update";

/** A term already in the destination, found by the same rule as the unique
 *  index: trimmed and lowercased. */
export type DestinationMatch = { name: string; definition: string | null };

export type CheckState = {
  /** Changes whenever anything the user would commit changes. */
  importId: string;
  drafts: DraftTerm[];
  removedIds: string[];
  policy: DuplicatePolicy;
  overrides: Record<string, DuplicatePolicy>;
  /** Applied to terms that came without a category. */
  category: string;
  matches: Record<string, DestinationMatch>;
};

export type CheckAction =
  | { type: "load"; drafts: DraftTerm[]; importId: string }
  | { type: "remove"; id: string; importId: string }
  | { type: "restore"; id: string; importId: string }
  | {
      type: "edit";
      id: string;
      patch: Partial<Pick<DraftTerm, "term" | "definition" | "category">>;
      importId: string;
    }
  | { type: "setPolicy"; policy: DuplicatePolicy; importId: string }
  | { type: "setOverride"; id: string; policy: DuplicatePolicy | null; importId: string }
  | { type: "setCategory"; category: string; importId: string }
  | { type: "setMatches"; matches: Record<string, DestinationMatch> };

export function termKey(term: string): string {
  return term.trim().toLowerCase();
}

export function initialCheckState(importId: string): CheckState {
  return {
    importId,
    drafts: [],
    removedIds: [],
    policy: "skip",
    overrides: {},
    category: "",
    matches: {},
  };
}

export function checkReducer(state: CheckState, action: CheckAction): CheckState {
  switch (action.type) {
    case "load":
      return {
        ...state,
        drafts: action.drafts,
        removedIds: [],
        overrides: {},
        matches: {},
        importId: action.importId,
      };
    case "remove":
      return state.removedIds.includes(action.id)
        ? state
        : { ...state, removedIds: [...state.removedIds, action.id], importId: action.importId };
    case "restore":
      return {
        ...state,
        removedIds: state.removedIds.filter((id) => id !== action.id),
        importId: action.importId,
      };
    case "edit":
      return {
        ...state,
        drafts: state.drafts.map((draft) =>
          draft.id === action.id ? { ...draft, ...action.patch } : draft,
        ),
        importId: action.importId,
      };
    case "setPolicy":
      return { ...state, policy: action.policy, overrides: {}, importId: action.importId };
    case "setOverride": {
      const overrides = { ...state.overrides };
      if (action.policy) overrides[action.id] = action.policy;
      else delete overrides[action.id];
      return { ...state, overrides, importId: action.importId };
    }
    case "setCategory":
      return { ...state, category: action.category, importId: action.importId };
    case "setMatches":
      return { ...state, matches: action.matches };
  }
}

export function activeDrafts(state: CheckState): DraftTerm[] {
  return state.drafts.filter((draft) => !state.removedIds.includes(draft.id));
}

export function matchFor(state: CheckState, draft: DraftTerm): DestinationMatch | undefined {
  return state.matches[termKey(draft.term)];
}

export function effectivePolicy(state: CheckState, draft: DraftTerm): DuplicatePolicy {
  return state.overrides[draft.id] ?? state.policy;
}

export type CheckSummary = {
  /** Terms the commit will write. */
  toAdd: number;
  /** New terms with no definition. */
  toFinish: number;
  /** Terms the destination already has. */
  alreadyThere: number;
  /** Already-there terms the commit will skip. */
  skipped: number;
  /** Already-there terms the commit will update. */
  updated: number;
};

export function summarize(state: CheckState): CheckSummary {
  const summary: CheckSummary = { toAdd: 0, toFinish: 0, alreadyThere: 0, skipped: 0, updated: 0 };
  for (const draft of activeDrafts(state)) {
    if (matchFor(state, draft)) {
      summary.alreadyThere += 1;
      if (effectivePolicy(state, draft) === "update") {
        summary.updated += 1;
        summary.toAdd += 1;
      } else {
        summary.skipped += 1;
      }
      continue;
    }
    summary.toAdd += 1;
    if (!draft.definition) summary.toFinish += 1;
  }
  return summary;
}

export type CommitTerm = {
  term: string;
  definition?: string;
  category?: string;
  example?: string;
  mental_model?: string;
  discussion?: string;
  anti_example?: string;
  controversy?: string;
  note?: string;
  on_duplicate: DuplicatePolicy;
};

function present(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** What gets sent to the server: only filled fields, the shared category on
 *  terms without one, and each term's own duplicate choice. */
export function toCommitTerms(state: CheckState): CommitTerm[] {
  const shared = present(state.category);
  return activeDrafts(state).map((draft) => ({
    term: draft.term.trim(),
    definition: present(draft.definition),
    category: present(draft.category) ?? shared,
    example: present(draft.example),
    mental_model: present(draft.mental_model),
    discussion: present(draft.discussion),
    anti_example: present(draft.anti_example),
    controversy: present(draft.controversy),
    note: present(draft.note),
    on_duplicate: effectivePolicy(state, draft),
  }));
}
