/** With a version the address names one exact clip, which the browser may keep. */
export function narrationSrc(termId: string, version?: string): string {
  const base = `/api/narration/${termId}`;
  return version ? `${base}?v=${version}` : base;
}

export function srcMatches(audio: HTMLAudioElement, src: string): boolean {
  const attr = audio.getAttribute("src");
  if (attr === src) return true;
  if (!audio.src) return false;
  return audio.src === new URL(src, document.baseURI).href;
}

export function canPlayThrough(audio: HTMLAudioElement): boolean {
  return audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** The browser refused to play without a tap; the clip itself is fine. */
export function isAutoplayBlocked(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}
