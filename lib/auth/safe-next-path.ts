export function safeNextPath(raw: string | null, fallback = "/jargon"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
}
