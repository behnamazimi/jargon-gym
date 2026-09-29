export type CollectionStatus = "none" | "builtin" | "published";

/** Published implies built-in (the database enforces it), so two flags make three states. */
export function statusOf(collection: { isBuiltin: boolean; isPublic: boolean }): CollectionStatus {
  if (collection.isPublic) return "published";
  return collection.isBuiltin ? "builtin" : "none";
}

export type StatusStep =
  | { kind: "update"; values: { is_builtin?: boolean; is_public?: boolean } }
  | { kind: "publish" };

/** What to do to get from one status to another. Un-building always clears
 *  public in the same update, since the database refuses a public collection
 *  that isn't built-in. Marking built-in comes before publishing. */
export function stepsFor(from: CollectionStatus, to: CollectionStatus): StatusStep[] {
  if (from === to) return [];
  if (to === "builtin") {
    return from === "none"
      ? [{ kind: "update", values: { is_builtin: true } }]
      : [{ kind: "update", values: { is_public: false } }];
  }
  if (to === "none") return [{ kind: "update", values: { is_builtin: false, is_public: false } }];
  return from === "none"
    ? [{ kind: "update", values: { is_builtin: true } }, { kind: "publish" }]
    : [{ kind: "publish" }];
}

/** Leaving Published takes the public page offline. */
export function needsOfflineConfirm(from: CollectionStatus, to: CollectionStatus): boolean {
  return from === "published" && to !== "published";
}
