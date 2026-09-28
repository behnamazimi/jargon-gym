/** How the account menus treat AI credits for this user. Decided on the server
 *  without a balance lookup, so ordinary page loads stay cheap. */
export type AiCreditsMenuMode = "own" | "credits" | "hidden";

export type AiCreditsLoad = {
  status: "idle" | "loading" | "ready" | "hidden";
  remaining: number | null;
};

export type AiCreditsLine = { label: string; tone: "muted" | "error" };

/** The one line the menus show about AI credits, or null to show nothing. */
export function aiCreditsLine(mode: AiCreditsMenuMode, load: AiCreditsLoad): AiCreditsLine | null {
  if (mode === "hidden") return null;
  if (mode === "own") return { label: "AI: your own key", tone: "muted" };

  if (load.status === "hidden") return null;
  if (load.remaining === null) return { label: "Checking AI credits…", tone: "muted" };
  if (load.remaining <= 0) return { label: "AI credits used up", tone: "error" };
  return {
    label: `${load.remaining} ${load.remaining === 1 ? "credit" : "credits"} left`,
    tone: "muted",
  };
}
