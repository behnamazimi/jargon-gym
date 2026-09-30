import { describe, expect, it } from "vitest";
import { NARRATION_PAUSE, renderPauses } from "./pause";

describe("renderPauses", () => {
  const script = `One. ${NARRATION_PAUSE} Two. ${NARRATION_PAUSE} Three.`;

  it("writes every pause in Murf's syntax", () => {
    expect(renderPauses(script, "murf")).toBe("One. [pause 1s] Two. [pause 1s] Three.");
  });

  it("writes every pause as ElevenLabs dashes", () => {
    expect(renderPauses(script, "elevenlabs")).toBe("One.  -- --  Two.  -- --  Three.");
  });

  it("drops the pauses and their spacing for a voice that doesn't use them", () => {
    expect(renderPauses(script, "none")).toBe("One. Two. Three.");
  });

  it("leaves a script without pauses alone", () => {
    expect(renderPauses("Just a story.", "murf")).toBe("Just a story.");
  });
});
