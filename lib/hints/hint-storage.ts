const DISMISS_KEY = "jargon-gym:hint-dismissed:v1";
const SNOOZE_KEY = "jargon-gym:hint-snoozed:v1";
const SHOWN_THIS_SESSION_KEY = "jargon-gym:hint-shown-session:v1";

const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const SNOOZE_COOLDOWN_MS = 3.5 * 60 * 60 * 1000;

type CooldownMap = Record<string, string>;

function readCooldownMap(key: string): CooldownMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw) as CooldownMap;
  } catch {
    return {};
  }
}

function writeCooldown(key: string, hintId: string, until: Date): void {
  if (typeof window === "undefined") return;

  try {
    const map = readCooldownMap(key);
    map[hintId] = until.toISOString();
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}

function isUnderCooldown(key: string, hintId: string, now: Date): boolean {
  const until = readCooldownMap(key)[hintId];
  if (!until) return false;
  return new Date(until).getTime() > now.getTime();
}

export function dismissHint(hintId: string, now: Date = new Date()): void {
  writeCooldown(DISMISS_KEY, hintId, new Date(now.getTime() + DISMISS_COOLDOWN_MS));
}

export function snoozeHint(hintId: string, now: Date = new Date()): void {
  writeCooldown(SNOOZE_KEY, hintId, new Date(now.getTime() + SNOOZE_COOLDOWN_MS));
}

export function isHintCoolingDown(hintId: string, now: Date = new Date()): boolean {
  return isUnderCooldown(DISMISS_KEY, hintId, now) || isUnderCooldown(SNOOZE_KEY, hintId, now);
}

export function hasShownHintThisSession(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(SHOWN_THIS_SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHintShownThisSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SHOWN_THIS_SESSION_KEY, "true");
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }
}
