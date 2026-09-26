import { PLATFORM_MEDIA } from "@/lib/platform";
import { countTermsForSelection } from "@/lib/study/count";
import type { StudyCollection } from "@/lib/study/types";

export function scrollToTop(cardEl: HTMLElement | null) {
  const behavior = window.matchMedia(PLATFORM_MEDIA.reducedMotion).matches ? "instant" : "smooth";

  if (cardEl) {
    cardEl.scrollIntoView({ behavior, block: "start" });
    return;
  }

  window.scrollTo({ top: 0, behavior });
}

export function allTermCount(collections: StudyCollection[]) {
  return countTermsForSelection(collections, "all");
}

export function termCountForSelection(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") return allTermCount(collections);
  return collections.find((collection) => collection.id === domainId)?.termCount ?? 0;
}

export function replaceReadDomainInUrl(domainId: string) {
  const url = new URL(window.location.href);
  if (domainId === "all") {
    url.searchParams.delete("domain");
  } else {
    url.searchParams.set("domain", domainId);
  }
  url.searchParams.delete("termId");
  url.searchParams.delete("alreadyRead");
  // Keeps a reload on Cards even when an unread story would redirect to Stories.
  url.searchParams.set("view", "cards");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Tidies the URL once Cards is showing: drops a stale collection and marks
 *  the view as Cards, so a reload or a refresh after saving an option never
 *  gets redirected to Stories. */
export function normalizeCardsUrl(resolvedDomainId: string) {
  const url = new URL(window.location.href);
  const param = url.searchParams.get("domain");
  if (param && (resolvedDomainId === "all" || param !== resolvedDomainId)) {
    url.searchParams.delete("domain");
  }
  if (!url.searchParams.has("termId")) url.searchParams.set("view", "cards");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable ||
    target.closest("[data-slot='select']") !== null ||
    target.closest("[role='listbox']") !== null
  );
}

function collectionName(domainId: string, collections: StudyCollection[]) {
  return collections.find((collection) => collection.id === domainId)?.name;
}

export function caughtUpDescription(domainId: string, collections: StudyCollection[]) {
  if (domainId === "all") {
    return "No terms in your active collections. Import some terms or turn a collection back on to start reading.";
  }

  const name = collectionName(domainId, collections);
  if (!name) {
    return "No terms in this collection. Pick another collection to keep reading.";
  }

  return `No terms in ${name}. Pick another collection to keep reading.`;
}
