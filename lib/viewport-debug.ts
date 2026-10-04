const STORAGE_KEY = "lb_viewport_debug";
const CHANGE_EVENT = "lb-viewport-debug";

export function readViewportDebug(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeViewportDebug(enabled: boolean) {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the toggle just won't stick.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeViewportDebug(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
