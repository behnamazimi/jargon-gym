/**
 * Client-side cache for narration audio, backed by the browser's Cache
 * Storage API. `loadNarrationAudio` is the module's only entry point: it
 * implements a cache-aside strategy so callers (TermNarrationPlayer) never
 * need to know whether a clip came from cache or the network — they just
 * get a Blob, or null if it couldn't be loaded either way.
 *
 * This is a plain TTL, not tied to the term's content hash: a term edited
 * (and re-narrated) while a client still holds a fresh cache entry keeps
 * playing the old clip until the entry expires. Acceptable trade-off given
 * how rarely narration content changes; lower CACHE_TTL_MS if that
 * staleness window needs to be tighter.
 */

const CACHE_NAME = "narration-audio-v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const CACHED_AT_HEADER = "x-cached-at";

function cacheKey(termId: string): string {
  return `https://narration-cache.local/${termId}`;
}

function hasCacheStorage(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

async function readFromCache(termId: string): Promise<Blob | null> {
  if (!hasCacheStorage()) return null;

  try {
    const cache = await caches.open(CACHE_NAME);
    const key = cacheKey(termId);
    const cached = await cache.match(key);
    if (!cached) return null;

    const cachedAt = Number(cached.headers.get(CACHED_AT_HEADER));
    if (!cachedAt || Date.now() - cachedAt > CACHE_TTL_MS) {
      await cache.delete(key);
      return null;
    }

    return await cached.blob();
  } catch {
    return null; // Cache Storage unavailable (quota, private mode, ...) — fall back to network
  }
}

async function writeToCache(termId: string, audio: Blob): Promise<void> {
  if (!hasCacheStorage()) return;

  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(audio, {
      headers: {
        "content-type": audio.type || "audio/mpeg",
        [CACHED_AT_HEADER]: String(Date.now()),
      },
    });
    await cache.put(cacheKey(termId), response);
  } catch {
    // best-effort — playback already succeeded without the cache write
  }
}

async function fetchAudio(signedUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(signedUrl);
    return response.ok ? await response.blob() : null;
  } catch {
    return null;
  }
}

/**
 * Resolves a term's narration audio, preferring a fresh local copy over the
 * network. `fetchSignedUrl` is only called on a cache miss, so callers can
 * skip their own server round trip entirely on a hit.
 */
export async function loadNarrationAudio(
  termId: string,
  fetchSignedUrl: () => Promise<string | null>,
): Promise<Blob | null> {
  const cached = await readFromCache(termId);
  if (cached) return cached;

  const signedUrl = await fetchSignedUrl();
  if (!signedUrl) return null;

  const audio = await fetchAudio(signedUrl);
  if (!audio) return null;

  void writeToCache(termId, audio); // best-effort, doesn't block playback
  return audio;
}
