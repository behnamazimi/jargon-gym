export const PAGE_SIZE = 25;

type PeopleView = "waitlist" | "members";
export type WaitlistFilter = "pending" | "invited" | "all";

export type PeopleParams = {
  view: PeopleView;
  status: WaitlistFilter;
  q: string;
  page: number;
  person: string | null;
};

export type RawParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Drops control characters, then trims and caps the length. */
export function cleanSearch(value: string | undefined): string {
  const printable = [...(value ?? "")].filter((char) => {
    const code = char.charCodeAt(0);
    return code > 31 && code !== 127;
  });
  return printable.join("").trim().slice(0, 100);
}

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** What comes from the address bar is untrusted, so every value is checked and defaulted. */
export function parsePeopleParams(raw: RawParams): PeopleParams {
  const status = first(raw.status);
  const person = first(raw.person);
  const page = Number.parseInt(first(raw.page) ?? "", 10);
  return {
    view: first(raw.view) === "members" ? "members" : "waitlist",
    status: status === "invited" || status === "all" ? status : "pending",
    q: cleanSearch(first(raw.q)),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 100_000) : 1,
    person: person && UUID.test(person) ? person : null,
  };
}

/** The last page that has rows, never below 1, so a page past the end shows the last one. */
export function clampPage(page: number, total: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

export function pageBounds(page: number, total: number): { from: number; to: number } {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: Math.min(from + PAGE_SIZE, total) };
}

/** An address for the people page that keeps only what is set. */
export function peopleHref(params: Partial<PeopleParams>): string {
  const query = new URLSearchParams();
  if (params.view === "members") query.set("view", "members");
  if (params.status && params.status !== "pending") query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.person) query.set("person", params.person);
  const text = query.toString();
  return text ? `/admin/people?${text}` : "/admin/people";
}
