/** A fixed UTC day (YYYY-MM-DD), so the server and the browser print the same text. */
export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? "—" : new Date(time).toISOString().slice(0, 10);
}

/** A fixed UTC time (YYYY-MM-DD HH:mm UTC), for the audit trail where the hour matters. */
export function formatAdminDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "—";
  return `${new Date(time).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** "in 3d 2h" or "5m ago": the gap from `from` to `to`, to the two largest units. */
export function formatRelative(to: Date, from: Date): string {
  const seconds = Math.round((to.getTime() - from.getTime()) / 1000);
  const abs = Math.abs(seconds);
  const units: [string, number][] = [
    ["d", 86_400],
    ["h", 3_600],
    ["m", 60],
  ];
  const parts: string[] = [];
  let rest = abs;
  for (const [unit, size] of units) {
    const count = Math.floor(rest / size);
    if (count > 0 && parts.length < 2) parts.push(`${count}${unit}`);
    rest -= count * size;
  }
  if (parts.length === 0) return seconds < 0 ? "under 1m ago" : "in under 1m";
  const text = parts.join(" ");
  return seconds < 0 ? `${text} ago` : `in ${text}`;
}
