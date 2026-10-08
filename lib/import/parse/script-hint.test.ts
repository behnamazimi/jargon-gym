import { describe, expect, it } from "vitest";
import { guessScriptLanguage } from "./script-hint";

describe("guessScriptLanguage", () => {
  it("reads kana as Japanese, with or without kanji", () => {
    expect(guessScriptLanguage(["お疲れ様です", "ありがとう"])).toBe("ja");
    expect(guessScriptLanguage(["食べる", "ありがとう"])).toBe("ja");
  });

  it("reads Hangul as Korean", () => {
    expect(guessScriptLanguage(["눈치", "안녕하세요"])).toBe("ko");
  });

  it("reads Han characters without kana as Chinese", () => {
    expect(guessScriptLanguage(["加油", "谢谢"])).toBe("zh");
  });

  it("reads Cyrillic as Russian", () => {
    expect(guessScriptLanguage(["соскучиться", "привет"])).toBe("ru");
  });

  it("says nothing for Latin script or too little text", () => {
    expect(guessScriptLanguage(["sobremesa", "flâner", "Feierabend"])).toBeNull();
    expect(guessScriptLanguage(["加"])).toBeNull();
    expect(guessScriptLanguage([])).toBeNull();
  });

  it("ignores a few foreign letters mixed into a list", () => {
    expect(guessScriptLanguage(["API", "加油", "谢谢", "你好"])).toBe("zh");
    expect(guessScriptLanguage(["Open source", "Cloud", "加"])).toBeNull();
  });
});
