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
