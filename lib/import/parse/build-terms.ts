import type { BuiltTerms, ColumnRole, DraftTerm, ParsedList, TermConflict } from "./types";

type Fields = Partial<Record<ColumnRole, string>>;

function fieldsForRow(row: string[], roles: ColumnRole[]): Fields {
  const fields: Fields = {};
  roles.forEach((role, index) => {
    const value = row[index]?.trim().replace(/^'(?=[=+\-@])/, "");
    if (role !== "ignore" && value && fields[role] === undefined) fields[role] = value;
  });
  return fields;
}

function sameText(a: string | null, b: string | null): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

type Folded = {
  terms: DraftTerm[];
  indexByKey: Map<string, number>;
  conflicts: Map<string, TermConflict>;
  collapsed: number;
};

/** Adds a row's draft to the list, or folds it into the term it repeats. */
function addDraft(state: Folded, draft: DraftTerm) {
  const key = draft.term.toLowerCase();
  const existingIndex = state.indexByKey.get(key);
  if (existingIndex === undefined) {
    state.indexByKey.set(key, state.terms.length);
    state.terms.push(draft);
    return;
  }

  const existing = state.terms[existingIndex];
  if (sameText(existing.definition, draft.definition) || !draft.definition) {
    state.collapsed++;
    return;
  }
  if (!existing.definition) {
    state.terms[existingIndex] = { ...existing, definition: draft.definition };
    state.collapsed++;
    return;
  }

  const conflict = state.conflicts.get(existing.id) ?? {
    termId: existing.id,
    term: existing.term,
    definitions: [existing.definition],
  };
  if (!conflict.definitions.some((definition) => sameText(definition, draft.definition))) {
    conflict.definitions.push(draft.definition);
  }
  state.conflicts.set(existing.id, conflict);
}

function draftFromFields(fields: Fields, id: string): DraftTerm {
  return {
    id,
    term: fields.term ?? "",
    definition: fields.definition ?? null,
    category: fields.category ?? null,
    example: fields.example ?? null,
    note: fields.note ?? null,
    mental_model: fields.mental_model ?? null,
    discussion: fields.discussion ?? null,
    anti_example: fields.anti_example ?? null,
    controversy: fields.controversy ?? null,
  };
}

/** Turns parsed rows into terms. Identical rows fold into one. The same term
 *  with different definitions is kept once and reported as a conflict. */
export function buildTerms(parsed: ParsedList): BuiltTerms {
  const roles = parsed.roles;
  const state: Folded = { terms: [], indexByKey: new Map(), conflicts: new Map(), collapsed: 0 };
  let withoutTerm = 0;

  parsed.rows.forEach((row, rowIndex) => {
    const fields = fieldsForRow(row, roles);
    if (!fields.term) {
      if (Object.keys(fields).length > 0) withoutTerm++;
      return;
    }
    addDraft(state, draftFromFields(fields, `row-${rowIndex}`));
  });

  return {
    terms: state.terms,
    collapsed: state.collapsed,
    withoutTerm,
    conflicts: [...state.conflicts.values()],
  };
}
