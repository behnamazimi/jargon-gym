export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateUniqueSlug(base: string, existingSlugs: ReadonlySet<string>): string {
  const root = slugify(base) || "item";
  if (!existingSlugs.has(root)) return root;

  let suffix = 2;
  let candidate = `${root}-${suffix}`;
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}
