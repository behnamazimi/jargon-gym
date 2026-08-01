export function safeNextPath(raw: string | null, fallback = "/jargon"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
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
