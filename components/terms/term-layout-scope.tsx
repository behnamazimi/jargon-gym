import { getSessionUser } from "@/lib/auth/require-session";
import { EMPTY_TERM_LAYOUT } from "@/lib/terms/term-layout";
import { getRequestTermLayout } from "@/lib/terms/term-layout-repository";
import { TermLayoutProvider } from "./term-layout-provider";

/** Gives the study pages beneath it the learner's term layout without making
 *  them wait for it. A failed read falls back to showing everything. */
export function TermLayoutScope({ children }: { children: React.ReactNode }) {
  const layout = getSessionUser()
    .then(({ user }) => (user ? getRequestTermLayout(user.id) : EMPTY_TERM_LAYOUT))
    .catch((err: unknown) => {
      console.error("Failed to load the term layout:", err);
      return EMPTY_TERM_LAYOUT;
    });
  return <TermLayoutProvider initialLayout={layout}>{children}</TermLayoutProvider>;
}
