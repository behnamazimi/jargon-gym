import { describe, expect, it } from "vitest";
import { checkReducer, initialCheckState, summarize, toCommitTerms } from "./check-state";
import type { DraftTerm } from "./parse/types";

function draft(id: string, term: string, definition: string | null = "d"): DraftTerm {
  return {
    id,
    term,
    definition,
    category: null,
    example: null,
    note: null,
    mental_model: null,
    discussion: null,
    anti_example: null,
    controversy: null,
  };
}

function loaded() {
  return checkReducer(initialCheckState("a"), {
    type: "load",
    importId: "b",
    drafts: [draft("1", "API"), draft("2", "Cache", null), draft("3", "SLA")],
  });
}

describe("check state", () => {
  it("counts terms to add and to finish", () => {
    expect(summarize(loaded())).toMatchObject({ toAdd: 3, toFinish: 1, alreadyThere: 0 });
  });

  it("removes and restores a card and changes the import id each time", () => {
    const removed = checkReducer(loaded(), { type: "remove", id: "1", importId: "c" });
    expect(summarize(removed).toAdd).toBe(2);
    expect(removed.importId).toBe("c");
    const restored = checkReducer(removed, { type: "restore", id: "1", importId: "d" });
    expect(summarize(restored).toAdd).toBe(3);
    expect(restored.importId).toBe("d");
  });

  it("edits a card", () => {
    const state = checkReducer(loaded(), {
      type: "edit",
      id: "2",
      patch: { definition: "now" },
      importId: "c",
    });
    expect(summarize(state).toFinish).toBe(0);
  });

  it("skips matches by default and updates when asked, per card or for all", () => {
    let state = checkReducer(loaded(), {
      type: "setMatches",
      matches: { api: { name: "API", definition: "old" }, sla: { name: "SLA", definition: null } },
    });
    expect(summarize(state)).toMatchObject({ toAdd: 1, alreadyThere: 2, skipped: 2, updated: 0 });

    state = checkReducer(state, { type: "setOverride", id: "1", policy: "update", importId: "c" });
    expect(summarize(state)).toMatchObject({ toAdd: 2, skipped: 1, updated: 1 });

    state = checkReducer(state, { type: "setPolicy", policy: "update", importId: "d" });
    expect(summarize(state)).toMatchObject({ toAdd: 3, skipped: 0, updated: 2 });
    expect(state.overrides).toEqual({});
  });

  it("sends only filled fields and the shared category", () => {
    const state = checkReducer(loaded(), {
      type: "setCategory",
      category: " Tech ",
      importId: "c",
    });
    expect(toCommitTerms(state)[1]).toEqual({
      term: "Cache",
      definition: undefined,
      category: "Tech",
      example: undefined,
      mental_model: undefined,
      discussion: undefined,
      anti_example: undefined,
      controversy: undefined,
      note: undefined,
      on_duplicate: "skip",
    });
  });
});
