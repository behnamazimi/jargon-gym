import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize";

const words = (text: string) => tokenize(text).map((token) => token.text);

describe("tokenize", () => {
  it.each([
    ["apostrophes", "A zzp'er and SLA's", ["A", "zzp'er", "and", "SLA's"]],
    ["curly apostrophe", "don’t stop", ["don’t", "stop"]],
    ["hyphens", "a follow-up on e-mail", ["a", "follow-up", "on", "e-mail"]],
    ["digits", "5G and Q3 for 401(k)", ["5G", "and", "Q3", "for", "401", "k"]],
    ["edge punctuation", '(renewal), "SLA".', ["renewal", "SLA"]],
    ["emoji dropped", "ship it 🚀 now", ["ship", "it", "now"]],
    ["cyrillic", "договор о сервисе", ["договор", "о", "сервисе"]],
    ["arabic", "عقد الخدمة", ["عقد", "الخدمة"]],
    ["combining accent", "café au lait", ["café", "au", "lait"]],
    ["empty", "", []],
    ["only punctuation", "…!?", []],
  ])("%s", (_name, text, expected) => {
    expect(words(text)).toEqual(expected);
  });

  it("reports offsets into the original text", () => {
    const [first, second] = tokenize("Hi  there");
    expect([first.start, first.end, second.start, second.end]).toEqual([0, 2, 4, 9]);
  });
});
