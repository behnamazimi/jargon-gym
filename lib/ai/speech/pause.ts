/** What a script holds where a pause belongs. Nothing else in the app knows how
 *  a voice writes a pause; each one gets it from `renderPauses`. */
export const NARRATION_PAUSE = "{{pause}}";

const PAUSE_SECONDS = 1;

const PAUSE_SYNTAX = {
  murf: `[pause ${PAUSE_SECONDS}s]`,
  // ElevenLabs has no pause tag; the dashes are read as a beat.
  elevenlabs: " -- -- ",
  // For voices that pause on their own, so the characters aren't spent.
  none: "",
} as const;

export type PauseStyle = keyof typeof PAUSE_SYNTAX;

export function renderPauses(script: string, style: PauseStyle): string {
  const syntax = PAUSE_SYNTAX[style];
  if (syntax) return script.replaceAll(NARRATION_PAUSE, syntax);
  return script.replaceAll(
    new RegExp(`\\s*${NARRATION_PAUSE.replace(/[{}]/g, "\\$&")}\\s*`, "g"),
    " ",
  );
}
