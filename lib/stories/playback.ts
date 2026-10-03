/** A tap on the speed button steps through these in order and wraps around. */
const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 0.75] as const;

export const MIN_PLAYBACK_SPEED = 0.5;
export const MAX_PLAYBACK_SPEED = 1.5;
export const PLAYBACK_SPEED_STEP = 0.05;

/** Rounds to the slider's step and keeps the speed in range. */
export function clampPlaybackSpeed(speed: number): number {
  const steps = Math.round((speed - MIN_PLAYBACK_SPEED) / PLAYBACK_SPEED_STEP);
  const stepped = MIN_PLAYBACK_SPEED + steps * PLAYBACK_SPEED_STEP;
  return Math.min(Math.max(Number(stepped.toFixed(2)), MIN_PLAYBACK_SPEED), MAX_PLAYBACK_SPEED);
}

/** Two decimals, so the text keeps its width as the speed changes; normal
 *  speed is just "1×". */
export function formatPlaybackSpeed(speed: number): string {
  return speed === 1 ? "1×" : `${speed.toFixed(2)}×`;
}

export function nextPlaybackSpeed(speed: number): number {
  const index = (PLAYBACK_SPEEDS as readonly number[]).indexOf(speed);
  if (index === -1) return 1;
  return PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length]!;
}

/** A saved speed within the slider's range, otherwise normal speed. */
export function parsePlaybackSpeed(stored: string | null): number {
  if (!stored) return 1;
  const speed = Number(stored);
  if (!Number.isFinite(speed) || speed < MIN_PLAYBACK_SPEED || speed > MAX_PLAYBACK_SPEED) return 1;
  return clampPlaybackSpeed(speed);
}

/** m:ss for the audio controls; 0:00 for anything not yet known. */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
