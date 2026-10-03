import { describe, expect, it } from "vitest";
import { cleanText } from "./text-clean";

describe("cleanText", () => {
  it.each([
    ["a NUL", "AP\u0000I", "API"],
    ["a bell and an escape", "A\u0007P\u001BI", "API"],
    ["DEL", "AP\u007FI", "API"],
    ["a C1 control", "AP\u0085I", "API"],
    ["a right-to-left override", "gnp.‮fdp", "gnp.fdp"],
    ["bidi embeddings and isolates", "a‪b‬c⁦d⁩e", "abcde"],
  ])("removes %s", (_name, input, expected) => {
    expect(cleanText(input)).toBe(expected);
  });

  it.each([
    ["tab, newline and carriage return", "a\tb\nc\r\nd"],
    ["left-to-right and right-to-left marks", "a‎b‏c"],
    ["Arabic", "عقد الخدمة"],
    ["Hebrew with a mark", "שלום‏"],
    ["accents", "café naïve"],
    ["emoji", "ship it 🚀 👩‍💻"],
    ["mixed scripts", "договор – 契約"],
  ])("keeps %s", (_name, input) => {
    expect(cleanText(input)).toBe(input);
  });
});
