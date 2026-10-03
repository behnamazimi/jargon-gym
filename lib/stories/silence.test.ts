import { describe, expect, it } from "vitest";
import { findPauses, loudnessEnvelope, type Pause } from "./silence";

const RATE = 1000;

/** Speech and silence stretches, in seconds, as a signal. */
function signal(parts: [kind: "speech" | "soft" | "quiet", seconds: number][]): Float32Array {
  const level = { speech: 0.5, soft: 0.01, quiet: 0.0002 };
  const samples: number[] = [];
  for (const [kind, seconds] of parts) {
    for (let i = 0; i < seconds * RATE; i += 1) {
      samples.push(kind === "quiet" ? level.quiet : level[kind] * Math.sin(i / 3));
    }
  }
  return Float32Array.from(samples);
}

function pausesOf(parts: Parameters<typeof signal>[0]): Pause[] {
  return findPauses(loudnessEnvelope(signal(parts), RATE));
}

describe("loudnessEnvelope", () => {
  it("gives one value per 10 ms, louder where there is sound", () => {
    const envelope = loudnessEnvelope(
      signal([
        ["speech", 0.5],
        ["quiet", 0.5],
      ]),
      RATE,
    );
    expect(envelope).toHaveLength(100);
    expect(envelope[10]!).toBeGreaterThan(envelope[80]! * 50);
  });

  it("is empty for an empty clip", () => {
    expect(loudnessEnvelope(new Float32Array(0), RATE)).toHaveLength(0);
  });
});

describe("findPauses", () => {
  it("finds the quiet between speech, with its start and end in seconds", () => {
    const [pause, ...rest] = pausesOf([
      ["speech", 1],
      ["quiet", 0.4],
      ["speech", 1],
    ]);
    expect(rest).toHaveLength(0);
    expect(pause!.start).toBeCloseTo(1, 1);
    expect(pause!.end).toBeCloseTo(1.4, 1);
  });

  it("leaves out silence before the first word and after the last", () => {
    expect(
      pausesOf([
        ["quiet", 0.6],
        ["speech", 1],
        ["quiet", 0.6],
      ]),
    ).toEqual([]);
  });

  it("marks where the near-silence inside a pause starts, after a soft last sound", () => {
    const [pause] = pausesOf([
      ["speech", 1],
      ["soft", 0.15],
      ["quiet", 0.4],
      ["speech", 1],
    ]);
    expect(pause!.start).toBeCloseTo(1, 1);
    expect(pause!.quiet!.start).toBeGreaterThan(1.13);
    expect(pause!.quiet!.end).toBeCloseTo(1.55, 1);
  });

  it("marks where the near-silence inside a pause ends, before a soft first sound", () => {
    const [pause] = pausesOf([
      ["speech", 1],
      ["quiet", 0.4],
      ["soft", 0.15],
      ["speech", 1],
    ]);
    expect(pause!.quiet!.start).toBeCloseTo(1, 1);
    expect(pause!.quiet!.end).toBeLessThan(1.42);
    expect(pause!.end).toBeCloseTo(1.55, 1);
  });

  it("copes with a clip whose silence is noisy", () => {
    const noisy = signal([
      ["speech", 1],
      ["quiet", 0.4],
      ["speech", 1],
    ]);
    for (let i = 1.0 * RATE; i < 1.4 * RATE; i += 1) noisy[i] = 0.01 * Math.sin(i * 7);
    const [pause] = findPauses(loudnessEnvelope(noisy, RATE));
    expect(pause!.start).toBeCloseTo(1, 1);
    expect(pause!.end).toBeCloseTo(1.4, 1);
    expect(pause!.quiet!.start).toBeCloseTo(1, 1);
    expect(pause!.quiet!.end).toBeCloseTo(1.4, 1);
  });

  it("ignores gaps too short to be a pause", () => {
    expect(
      pausesOf([
        ["speech", 1],
        ["quiet", 0.05],
        ["speech", 1],
      ]),
    ).toEqual([]);
  });

  it("judges quiet against how loud the voice is, not a fixed level", () => {
    const quietVoice = signal([
      ["speech", 1],
      ["quiet", 0.3],
      ["speech", 1],
    ]).map((sample) => sample * 0.05);
    expect(findPauses(loudnessEnvelope(quietVoice, RATE))).toHaveLength(1);
  });

  it("finds nothing in silence or an empty clip", () => {
    expect(findPauses(new Float32Array(0))).toEqual([]);
    expect(findPauses(new Float32Array(50))).toEqual([]);
  });
});
