// WHATWG URL treats "\" as "/", so prefix checks alone can't reject
// protocol-relative escapes like "/\evil.com". Resolve against a sentinel
// origin and only accept paths that stay on it.
const BASE = "https://n.invalid";

export function safeNextPath(raw: string | null, fallback = "/jargon"): string {
  if (!raw || !raw.startsWith("/")) {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }

  if (url.origin !== BASE) {
    return fallback;
  }

  return url.pathname + url.search + url.hash;
}

export function requestPathWithSearch(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function appendNextParam(path: string, next: string | null | undefined): string {
  if (!next) return path;

  const safe = safeNextPath(next);
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("next", safe);
  return `${base}?${params.toString()}`;
}
