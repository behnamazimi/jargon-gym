import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getNarrationAccessForUser } from "@/lib/narration/access";
import { DEFAULT_NARRATION_MODE, getNarrationModes } from "@/lib/narration/mode";
import { loadNarrationVersions } from "@/lib/narration/versions";
import type { QuizTerm } from "./types";

/** Gives vocabulary terms the clip a dictation question plays. Only clips that
 *  say the word alone count, and only for learners with narration. Any failure
 *  leaves the terms as they were, so the quiz just asks other questions. */
export async function attachDictationClips(
  admin: SupabaseClient<Database>,
  userId: string,
  terms: QuizTerm[],
): Promise<QuizTerm[]> {
  const vocabulary = terms.filter((term) => term.kind === "vocabulary");
  if (vocabulary.length === 0) return terms;

  try {
    if (!(await getNarrationAccessForUser(admin, userId))) return terms;

    const modes = await getNarrationModes(admin, [
      ...new Set(vocabulary.map((term) => term.collectionId)),
    ]);
    const wordOnly = vocabulary.filter(
      (term) => (modes.get(term.collectionId) ?? DEFAULT_NARRATION_MODE) === "term",
    );
    if (wordOnly.length === 0) return terms;

    const versions = await loadNarrationVersions(
      admin,
      wordOnly.map((term) => term.id),
    );
    return terms.map((term) => {
      const clip = versions.get(term.id);
      return clip ? { ...term, dictationClip: clip } : term;
    });
  } catch (error) {
    console.error("Couldn't look up dictation clips:", error);
    return terms;
  }
}
