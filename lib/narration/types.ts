import type { Database } from "@/lib/supabase/database.types";

type TermRow = Database["public"]["Tables"]["terms"]["Row"];

/**
 * The subset of a term's columns that feed the narration script — derived
 * from the generated DB row type so this stays in sync if `terms` gains,
 * renames, or drops a column, rather than duplicating the shape by hand.
 */
export type NarratedTermFields = Pick<
  TermRow,
  "term" | "definition" | "example" | "mental_model" | "discussion" | "anti_example" | "controversy"
>;

export type NarrationResult = { status: "ready"; signedUrl: string } | { status: "unavailable" };
