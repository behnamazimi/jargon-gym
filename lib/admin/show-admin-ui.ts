const STORAGE_KEY = "jargon-gym:show-admin-ui:v1";
const CHANGE_EVENT = "jargon-gym:show-admin-ui-change";

export function getShowAdminUi(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getServerShowAdminUi(): boolean {
  return false;
}

export function setShowAdminUi(value: boolean): void {
  if (typeof window === "undefined") return;

  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore quota errors or private browsing restrictions.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeShowAdminUi(onStoreChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}
