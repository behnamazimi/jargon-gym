/**
 * Only one narration clip should play at a time — the jargon collection
 * page renders many TermNarrationPlayer instances at once, and a story's
 * player sits next to them in Read. Starting a new clip pauses whichever was
 * previously playing (simultaneous fetches/loads are fine; simultaneous
 * *playback* is not). A module-level singleton coordinates this across every
 * independent player.
 *
 * `previous.pause()` fires a 'pause' event asynchronously, so `active` is
 * reassigned before that fires — by the time the paused instance's own
 * onpause handler runs, `active` already points elsewhere, so it correctly
 * treats that pause as "someone else took the slot" instead of a load glitch.
 */
let activeAudio: HTMLAudioElement | null = null;

export function claimActiveAudio(audio: HTMLAudioElement) {
  const previous = activeAudio;
  activeAudio = audio;
  if (previous && previous !== audio) previous.pause();
}

export function releaseActiveAudio(audio: HTMLAudioElement) {
  if (activeAudio === audio) activeAudio = null;
}

export function isActiveAudio(audio: HTMLAudioElement): boolean {
  return activeAudio === audio;
}
