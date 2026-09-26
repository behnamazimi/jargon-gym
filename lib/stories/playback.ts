/** The speed button steps through these in order and wraps around. */
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 0.75] as const;

export function nextPlaybackSpeed(speed: number): number {
  const index = (PLAYBACK_SPEEDS as readonly number[]).indexOf(speed);
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length]!;
}

/** A saved speed if it's one we offer, otherwise normal speed. */
export function parsePlaybackSpeed(stored: string | null): number {
  const speed = Number(stored);
  return (PLAYBACK_SPEEDS as readonly number[]).includes(speed) ? speed : 1;
}

/** m:ss for the audio controls; 0:00 for anything not yet known. */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
