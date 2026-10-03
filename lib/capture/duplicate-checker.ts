export type DuplicateMatch = { term: string; finished: boolean };

type Lookup = (domainId: string, term: string) => Promise<DuplicateMatch | null>;

/** Runs a lookup after a pause and reports only the latest one. Each call clears
 *  the shown answer first, so a note never outlives the text it was about; a
 *  failed lookup shows nothing. */
export function createDuplicateChecker(
  lookup: Lookup,
  onResult: (match: DuplicateMatch | null) => void,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  return function check(domainId: string | null, term: string) {
    clearTimeout(timer);
    const id = ++latest;
    onResult(null);
    const trimmed = term.trim();
    if (!domainId || !trimmed) return;

    timer = setTimeout(async () => {
      let found: DuplicateMatch | null = null;
      try {
        found = await lookup(domainId, trimmed);
      } catch {
        // Saving still reports a real duplicate.
      }
      if (id === latest) onResult(found);
    }, delayMs);
  };
}
