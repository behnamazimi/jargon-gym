/**
 * Client-side cache for narration audio, backed by the browser's Cache
 * Storage API. Lets TermNarrationPlayer skip the server round trip (auth +
 * access check + S3 signed URL) and the audio download entirely when the
 * same term was played recently.
 *
 * This is a plain TTL: a term edited (and re-narrated) while a client still
 * holds a fresh cache entry keeps playing the old clip until the entry
 * expires. Acceptable trade-off given how rarely narration content changes;
 * lower CACHE_TTL_MS if that staleness window needs to be tighter.
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

export async function getCachedNarrationAudio(termId: string): Promise<Blob | null> {
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

export async function setCachedNarrationAudio(termId: string, audio: Blob): Promise<void> {
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
