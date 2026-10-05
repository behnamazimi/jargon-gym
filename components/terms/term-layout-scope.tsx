import { getSessionUser } from "@/lib/auth/require-session";
import { EMPTY_TERM_LAYOUT } from "@/lib/terms/term-layout";
import { getRequestTermLayout } from "@/lib/terms/term-layout-repository";
import { TermLayoutProvider } from "./term-layout-provider";

/** Gives the study pages beneath it the learner's term layout. A failed read
 *  falls back to showing everything. */
export async function TermLayoutScope({ children }: { children: React.ReactNode }) {
  const { user } = await getSessionUser();
  const layout = user
    ? await getRequestTermLayout(user.id).catch((err: unknown) => {
        console.error("Failed to load the term layout:", err);
        return EMPTY_TERM_LAYOUT;
      })
    : EMPTY_TERM_LAYOUT;
  return <TermLayoutProvider initialLayout={layout}>{children}</TermLayoutProvider>;
}
