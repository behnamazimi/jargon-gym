/** How the account menus treat AI credits for this user. Decided on the server
 *  without a balance lookup, so ordinary page loads stay cheap. */
export type AiCreditsMenuMode = "credits" | "hidden";

export type AiCreditsLoad = {
  status: "idle" | "loading" | "ready" | "hidden";
  remaining: number | null;
};

export type AiCreditsLine = {
  label: string;
  tone: "muted" | "error";
  /** No balance yet, so the row isn't a link. */
  pending?: boolean;
};

/** What the balance lookup returned, as the state the menus render from.
 *  A missing result (credits off, or the lookup failed) hides the row. */
export function toAiCreditsLoad(result: { remaining: number } | null): AiCreditsLoad {
  return result
    ? { status: "ready", remaining: result.remaining }
    : { status: "hidden", remaining: null };
}

/** The one line the menus show about AI credits, or null to show nothing. */
export function aiCreditsLine(mode: AiCreditsMenuMode, load: AiCreditsLoad): AiCreditsLine | null {
  if (mode === "hidden") return null;

  if (load.status === "hidden") return null;
  if (load.remaining === null)
    return { label: "Checking AI credits…", tone: "muted", pending: true };
  if (load.remaining <= 0) return { label: "AI credits used up", tone: "error" };
  return {
    label: `${load.remaining} ${load.remaining === 1 ? "credit" : "credits"} left`,
    tone: "muted",
  };
}
