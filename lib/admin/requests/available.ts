export type AvailableActions = {
  accept: boolean;
  ask: boolean;
  merge: boolean;
  decline: boolean;
  newDate: boolean;
  resend: boolean;
};

/** What the admin can do to a request in its current state. */
export function availableActions(request: {
  status: string;
  kind: string;
  delayNotifiedAt: string | null;
}): AvailableActions {
  const working = request.status === "requested" || request.status === "in_progress";
  const open = working || request.status === "needs_input" || request.status === "merged";
  return {
    accept: request.status === "requested",
    ask: working,
    // A definitions request belongs to one person's collection, so it has nobody to merge with.
    merge: working && request.kind !== "definitions",
    decline: open,
    newDate: working && !request.delayNotifiedAt,
    resend:
      ["ready", "needs_input", "declined"].includes(request.status) || !!request.delayNotifiedAt,
  };
}
