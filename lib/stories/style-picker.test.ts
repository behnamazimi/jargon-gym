import { describe, expect, it } from "vitest";
import { pickStyle, styleWeights } from "./style-picker";
import { STORY_FORMATS, STORY_TONES } from "./styles";
import type { StoryVote } from "./types";

const NOW = new Date("2026-09-26T12:00:00Z");

function vote(overrides: Partial<StoryVote>): StoryVote {
  return { format: "email", tone: "casual", vote: 1, createdAt: NOW, ...overrides };
}

function weightOf(weights: { id: string; weight: number }[], id: string) {
  return weights.find((entry) => entry.id === id)!.weight;
}

describe("styleWeights", () => {
  it("is uniform with no votes", () => {
    const weights = styleWeights(STORY_FORMATS, [], (v) => v.format, NOW);
    expect(new Set(weights.map((entry) => entry.weight))).toEqual(new Set([1]));
  });

  it("lowers a disliked style without ruling it out", () => {
    const weights = styleWeights(
      STORY_FORMATS,
      [vote({ vote: -1 }), vote({ vote: -1 }), vote({ vote: -1 })],
      (v) => v.format,
      NOW,
    );
    expect(weightOf(weights, "email")).toBeLessThan(weightOf(weights, "blog-post"));
    expect(weightOf(weights, "email")).toBeGreaterThan(0);
  });

  it("raises a liked style", () => {
    const weights = styleWeights(STORY_TONES, [vote({ tone: "formal" })], (v) => v.tone, NOW);
    expect(weightOf(weights, "formal")).toBeGreaterThan(weightOf(weights, "casual"));
  });

  it("lets older votes count for less", () => {
    const fresh = styleWeights(STORY_FORMATS, [vote({})], (v) => v.format, NOW);
    const old = styleWeights(
      STORY_FORMATS,
      [vote({ createdAt: new Date("2026-08-01T12:00:00Z") })],
      (v) => v.format,
      NOW,
    );
    expect(weightOf(old, "email")).toBeLessThan(weightOf(fresh, "email"));
    expect(weightOf(old, "email")).toBeGreaterThan(1);
  });

  it("ignores votes for styles no longer offered", () => {
    const weights = styleWeights(STORY_FORMATS, [vote({ format: "sonnet" })], (v) => v.format, NOW);
    expect(new Set(weights.map((entry) => entry.weight))).toEqual(new Set([1]));
  });
});

describe("pickStyle", () => {
  it("returns an offered format and tone", () => {
    const style = pickStyle([], () => 0.5, NOW);
    expect(STORY_FORMATS.map((option) => option.id)).toContain(style.format);
    expect(STORY_TONES.map((option) => option.id)).toContain(style.tone);
  });

  it("walks the weights in order", () => {
    expect(pickStyle([], () => 0, NOW)).toEqual({
      format: STORY_FORMATS[0]!.id,
      tone: STORY_TONES[0]!.id,
    });
    expect(pickStyle([], () => 0.9999, NOW)).toEqual({
      format: STORY_FORMATS[STORY_FORMATS.length - 1]!.id,
      tone: STORY_TONES[STORY_TONES.length - 1]!.id,
    });
  });
});
