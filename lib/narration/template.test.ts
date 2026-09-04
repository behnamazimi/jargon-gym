import { describe, expect, it } from "vitest";
import { buildNarrationScript } from "./template";

const BASE = {
  term: "Closure",
  definition: "A function bundled with its lexical scope.",
  example: null,
  mental_model: null,
  discussion: null,
  anti_example: null,
  controversy: null,
};

describe("buildNarrationScript", () => {
  it("always includes term and definition", () => {
    const script = buildNarrationScript(BASE, "en");
    expect(script).toContain("Closure.");
    expect(script).toContain(BASE.definition);
  });

  it("omits sections for empty optional fields", () => {
    const script = buildNarrationScript(BASE, "en");
    expect(script).not.toContain("For example");
    expect(script).not.toContain("Think of it like this");
  });

  it("includes optional fields when present, in display order", () => {
    const script = buildNarrationScript(
      {
        ...BASE,
        mental_model: "A backpack of variables.",
        example: "A counter factory.",
        anti_example: "Forgetting the scope is captured by reference.",
        discussion: "Used heavily in event handlers.",
        controversy: "Some say it's overused.",
      },
      "en",
    );

    const order = [
      "Think of it like this",
      "For example",
      "A common mistake",
      "In practice",
      "One point of debate",
    ].map((marker) => script.indexOf(marker));

    expect(order.every((index) => index !== -1)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("ignores whitespace-only optional fields", () => {
    const script = buildNarrationScript({ ...BASE, example: "   " }, "en");
    expect(script).not.toContain("For example");
  });

  it("uses Dutch connector phrases for a Dutch collection", () => {
    const script = buildNarrationScript({ ...BASE, example: "Een voorbeeld." }, "nl");
    expect(script).toContain("Bijvoorbeeld,");
    expect(script).not.toContain("For example");
  });

  it("falls back to plain [pause]-joined concatenation for a language with no translation", () => {
    // Cast past the DomainLanguage union to exercise the fallback path for a
    // language that isn't translated yet (e.g. a future addition to the type
    // without matching CONNECTOR_PHRASES entry).
    const script = buildNarrationScript({ ...BASE, example: "An example." }, "fr" as never);
    expect(script).toContain("[pause] An example.");
    expect(script).not.toContain("For example");
    expect(script).not.toContain("Bijvoorbeeld");
  });
});
