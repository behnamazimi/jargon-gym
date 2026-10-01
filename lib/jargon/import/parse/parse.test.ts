import { describe, expect, it } from "vitest";
import { buildTerms } from "./build-terms";
import { decodeFileBytes } from "./decode";
import { looksLikeJson, parseList } from "./detect";
import { cleanLine } from "./lines";
import { normalizeText } from "./normalize";
import type { ParseOptions } from "./types";

function pairsOf(text: string, options?: ParseOptions) {
  return buildTerms(parseList(text, options)).terms.map((t) => [t.term, t.definition]);
}

describe("normalizeText", () => {
  it.each([
    ["CRLF", "a\r\nb", "a\nb"],
    ["lone CR", "a\rb", "a\nb"],
    ["NBSP", "a b", "a b"],
    ["zero width and BOM", "﻿a​b", "ab"],
    ["trailing spaces", "a  \nb\t", "a\nb"],
    ["smart quotes kept", "zzp’er “x”", "zzp’er “x”"],
  ])("%s", (_name, input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });
});

describe("cleanLine", () => {
  it.each([
    ["• API – x", "API – x"],
    ["- API – x", "API – x"],
    ["* API", "API"],
    ["◦ API", "API"],
    ["1. API", "API"],
    ["2) API", "API"],
    ["a. API", "API"],
    ["☐ API", "API"],
    ["☑ API", "API"],
    ["- [ ] API", "API"],
    ["- [x] API", "API"],
    ["5G – fifth generation", "5G – fifth generation"],
    ["3D printing", "3D printing"],
    ["401(k) – US pension", "401(k) – US pension"],
    ["24/7 – always on", "24/7 – always on"],
    ["[24/12/2025, 14:05:09] Sam: API – x", "API – x"],
    ["[12/24/25, 2:05:09 PM] Sam: API – x", "API – x"],
    ["24/12/2025, 14:05 - Sam: API – x", "API – x"],
    ["[14:05, 24/12/2025] Sam: API – x", "API – x"],
    ["[24-12-2025, 14.05.09] Marie Jansen: vergadering – meeting", "vergadering – meeting"],
  ])("%s", (input, expected) => {
    expect(cleanLine(input)).toBe(expected);
  });
});

describe("one item per line", () => {
  it.each([
    [
      "en dash",
      "API – a way to talk\nCache – stored copy",
      [
        ["API", "a way to talk"],
        ["Cache", "stored copy"],
      ],
    ],
    [
      "em dash",
      "API — a way to talk\nCache — stored copy",
      [
        ["API", "a way to talk"],
        ["Cache", "stored copy"],
      ],
    ],
    [
      "spaced hyphen",
      "API - a way\nCache - copy",
      [
        ["API", "a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "colon",
      "API: a way\nCache: copy",
      [
        ["API", "a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "equals",
      "API = a way\nCache = copy",
      [
        ["API", "a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "comma last",
      "API, a way\nCache, copy",
      [
        ["API", "a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "first occurrence only",
      "API: Application Programming Interface: a way\nCache: copy",
      [
        ["API", "Application Programming Interface: a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "hyphenated terms are not split",
      "follow-up – a later contact\ne-mail – messages\nend-to-end – whole path",
      [
        ["follow-up", "a later contact"],
        ["e-mail", "messages"],
        ["end-to-end", "whole path"],
      ],
    ],
    [
      "times, urls and ratios are not separators",
      "10:30 meeting\nhttps://x.dev docs\n3:1 ratio\nAPI: a way\nCache: copy\nSLA: promise",
      [
        ["10:30 meeting", null],
        ["https://x.dev docs", null],
        ["3:1 ratio", null],
        ["API", "a way"],
        ["Cache", "copy"],
        ["SLA", "promise"],
      ],
    ],
    [
      "bullets, numbers and checkboxes",
      "1. API – a way\n- Cache – copy\n☐ SLA – promise",
      [
        ["API", "a way"],
        ["Cache", "copy"],
        ["SLA", "promise"],
      ],
    ],
    [
      "mixed: the common separator wins, others become words",
      "API – a way\nCache – copy\nOrphan line",
      [
        ["API", "a way"],
        ["Cache", "copy"],
        ["Orphan line", null],
      ],
    ],
    [
      "a line with a term and a trailing separator is a bare term",
      "API –\nCache – copy\nSLA – promise",
      [
        ["API", null],
        ["Cache", "copy"],
        ["SLA", "promise"],
      ],
    ],
    [
      "WhatsApp copy",
      "[24/12/2025, 14:05:09] Sam: API – a way\n[24/12/2025, 14:05:20] Sam: Cache – copy",
      [
        ["API", "a way"],
        ["Cache", "copy"],
      ],
    ],
    [
      "emoji and RTL pass through",
      "😀 – smile\nمرحبا – hello",
      [
        ["😀", "smile"],
        ["مرحبا", "hello"],
      ],
    ],
    [
      "apostrophes kept",
      "zzp’er – freelancer\nSLA's – promises",
      [
        ["zzp’er", "freelancer"],
        ["SLA's", "promises"],
      ],
    ],
  ])("%s", (_name, input, expected) => {
    expect(pairsOf(input)).toEqual(expected);
  });

  it("uses a chosen separator and a custom one", () => {
    expect(pairsOf("API: a way – x\nCache: copy – y", { separator: "dash" })).toEqual([
      ["API: a way", "x"],
      ["Cache: copy", "y"],
    ]);
    expect(
      pairsOf("API::a way\nCache::copy", { separator: "custom", customSeparator: "::" }),
    ).toEqual([
      ["API", "a way"],
      ["Cache", "copy"],
    ]);
  });

  it("splits cards by a custom card separator", () => {
    expect(
      pairsOf("API::a way##Cache::copy", {
        separator: "custom",
        customSeparator: "::",
        cardSeparator: "##",
      }),
    ).toEqual([
      ["API", "a way"],
      ["Cache", "copy"],
    ]);
  });

  it("reads alternating short and long lines as pairs", () => {
    const parsed = parseList(
      "API\na way for programs to talk to each other\nCache\na stored copy of a result",
    );
    expect(parsed.format).toBe("pairs");
    expect(buildTerms(parsed).terms.map((t) => t.term)).toEqual(["API", "Cache"]);
  });

  it("falls back to a list of bare words", () => {
    const parsed = parseList("runway\nchurn\nburn rate");
    expect(parsed.format).toBe("words");
    expect(buildTerms(parsed).terms).toMatchObject([
      { term: "runway", definition: null },
      { term: "churn", definition: null },
      { term: "burn rate", definition: null },
    ]);
  });
});

describe("spreadsheet and CSV text", () => {
  it("reads tab separated text", () => {
    const parsed = parseList("API\ta way\nCache\tcopy");
    expect(parsed.format).toBe("tsv");
    expect(pairsOf("API\ta way\nCache\tcopy")).toEqual([
      ["API", "a way"],
      ["Cache", "copy"],
    ]);
  });

  it("keeps quoted multi-line cells together", () => {
    expect(pairsOf('API\t"line one\nline two"\nCache\tcopy')).toEqual([
      ["API", "line one\nline two"],
      ["Cache", "copy"],
    ]);
  });

  it("ignores trailing empty cells and a trailing empty line", () => {
    expect(pairsOf("API\ta way\t\t\nCache\tcopy\t\t\n\n")).toEqual([
      ["API", "a way"],
      ["Cache", "copy"],
    ]);
  });

  it("reads Dutch-locale semicolon CSV", () => {
    const parsed = parseList("vergadering;meeting\nwerkoverleg;team meeting");
    expect(parsed.format).toBe("csv");
    expect(buildTerms(parsed).terms.map((t) => [t.term, t.definition])).toEqual([
      ["vergadering", "meeting"],
      ["werkoverleg", "team meeting"],
    ]);
  });

  it("reads comma CSV with quotes", () => {
    expect(pairsOf('API,"a way, to talk"\nCache,copy')).toEqual([
      ["API", "a way, to talk"],
      ["Cache", "copy"],
    ]);
  });

  it("uses the heading row for roles and drops it", () => {
    const parsed = parseList("Word\tMeaning\tExample\nAPI\ta way\tuse the API");
    expect(parsed.heading).toEqual(["Word", "Meaning", "Example"]);
    expect(buildTerms(parsed).terms[0]).toMatchObject({
      term: "API",
      definition: "a way",
      example: "use the API",
    });
  });

  it("reads Dutch headings", () => {
    const parsed = parseList("woord\tbetekenis\nvergadering\tmeeting");
    expect(parsed.heading).not.toBeNull();
    expect(parsed.rows).toEqual([["vergadering", "meeting"]]);
  });

  it("does not take a real first term called Definition for a heading", () => {
    const parsed = parseList("Definition\tA statement of a meaning\nAPI\ta way");
    expect(parsed.heading).toBeNull();
    expect(parsed.rows).toHaveLength(2);
  });

  it("lets the user force or drop the heading", () => {
    expect(parseList("Term\tMeaning\nAPI\ta way", { heading: false }).rows).toHaveLength(2);
    expect(parseList("API\ta way\nCache\tcopy", { heading: true }).rows).toHaveLength(1);
  });

  it("a header-only paste has no terms", () => {
    expect(buildTerms(parseList("Term\tDefinition")).terms).toEqual([]);
  });

  it("maps three or more columns by role", () => {
    const parsed = parseList("API\ta way\tTech\nCache\tcopy\tTech", {
      roles: ["term", "definition", "category"],
    });
    expect(buildTerms(parsed).terms[0]).toMatchObject({ category: "Tech" });
  });

  it("swaps term and definition", () => {
    const parsed = parseList("a way\tAPI\ncopy\tCache");
    expect(buildTerms(parsed, { swap: true }).terms.map((t) => t.term)).toEqual(["API", "Cache"]);
  });
});

describe("clipboard HTML tables", () => {
  const html =
    "<table><tr><td>API</td><td>a&nbsp;way<br>to talk</td></tr><tr><td>Cache</td><td>copy &amp; reuse</td></tr></table>";

  it("takes rows and cells from the table", () => {
    const parsed = parseList("ignored text", { html });
    expect(parsed.format).toBe("html_table");
    expect(buildTerms(parsed).terms.map((t) => [t.term, t.definition])).toEqual([
      ["API", "a way to talk"],
      ["Cache", "copy & reuse"],
    ]);
  });

  it("falls back to the text when there is no table", () => {
    expect(parseList("API – a way\nCache – copy", { html: "<p>API – a way</p>" }).format).toBe(
      "lines",
    );
  });
});

describe("Anki plain text export", () => {
  it("applies the headers and cleans fields", () => {
    const text =
      "#separator:tab\n#html:true\n#columns:Front\tBack\n" +
      '<b>API</b>\tA way [sound:a.mp3]<img src="x.png">&amp; more\n' +
      "Cloze\t{{c1::answer::hint}} here<br>next\n";
    const parsed = parseList(text);
    expect(parsed.format).toBe("anki");
    expect(buildTerms(parsed).terms.map((t) => [t.term, t.definition])).toEqual([
      ["API", "A way & more"],
      ["Cloze", "answer here next"],
    ]);
  });

  it("understands a comma separator header", () => {
    expect(pairsOf("#separator:comma\nAPI,a way\nCache,copy")).toEqual([
      ["API", "a way"],
      ["Cache", "copy"],
    ]);
  });
});

describe("duplicates inside a paste", () => {
  it("folds identical rows and counts them", () => {
    const built = buildTerms(parseList("API – a way\napi – A way\nCache – copy"));
    expect(built.terms).toHaveLength(2);
    expect(built.collapsed).toBe(1);
    expect(built.conflicts).toEqual([]);
  });

  it("reports the same term with different definitions", () => {
    const built = buildTerms(parseList("SLA – promise\nSLA – a legal contract\nCache – copy"));
    expect(built.terms).toHaveLength(2);
    expect(built.conflicts).toEqual([
      { termId: "row-0", term: "SLA", definitions: ["promise", "a legal contract"] },
    ]);
  });

  it("fills a missing definition from a repeated row", () => {
    const built = buildTerms(parseList("SLA\nSLA – promise\nCache – copy"));
    expect(built.terms[0]).toMatchObject({ term: "SLA", definition: "promise" });
  });

  it("counts lines that have a definition but no term", () => {
    const built = buildTerms(parseList("– just a definition\nAPI – a way\nCache – copy"));
    expect(built.withoutTerm).toBe(1);
    expect(built.terms).toHaveLength(2);
  });

  it("hints at a swap when terms are long and definitions short", () => {
    const long = "a statement that describes what it is in many many words";
    const built = buildTerms(parseList(`${long}\tAPI\n${long} two\tCache`));
    expect(built.swapHint).toBe(true);
  });
});

describe("empty input", () => {
  it.each(["", "   ", "\n\n"])("%j has no terms", (input) => {
    expect(buildTerms(parseList(input)).terms).toEqual([]);
  });
});

describe("JSON and files", () => {
  it.each([
    ['{"a":1}', true],
    ["  [1]", true],
    ["API – x", false],
    ["", false],
  ])("looksLikeJson(%j)", (input, expected) => {
    expect(looksLikeJson(input)).toBe(expected);
  });

  it("reads UTF-8", () => {
    expect(decodeFileBytes(new TextEncoder().encode("café – coffee"))).toEqual({
      kind: "text",
      text: "café – coffee",
    });
  });

  it("reads UTF-16 with a byte-order mark", () => {
    const le = new Uint8Array([
      0xff,
      0xfe,
      ..."API".split("").flatMap((c) => [c.charCodeAt(0), 0]),
    ]);
    expect(decodeFileBytes(le).text).toContain("API");
    const be = new Uint8Array([
      0xfe,
      0xff,
      ..."API".split("").flatMap((c) => [0, c.charCodeAt(0)]),
    ]);
    expect(decodeFileBytes(be).text).toContain("API");
  });

  it("falls back to Windows-1252 so accents survive", () => {
    expect(decodeFileBytes(new Uint8Array([0x63, 0x61, 0x66, 0xe9])).text).toBe("café");
  });

  it("recognises JSON and packages", () => {
    expect(decodeFileBytes(new TextEncoder().encode(' {"a":1}')).kind).toBe("json");
    expect(decodeFileBytes(new Uint8Array([0x50, 0x4b, 3, 4])).kind).toBe("package");
  });
});
