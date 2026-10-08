import type { CollectionLanguage } from "@/lib/terms/languages";
import type { Database } from "@/lib/supabase/database.types";
import type { ProviderCall } from "./provider";

export type AudioJob = Database["public"]["Tables"]["audio_jobs"]["Row"];

/** What a term clip and a story clip have in common: who they belong to, the
 *  hashes that say whether a stored clip is still current, and how to get the
 *  script when a new clip has to be made. */
export type SpeechSubject = {
  type: "term" | "story";
  id: string;
  /** The story's owner. Terms are shared, so it is null for them. */
  userId: string | null;
  /** Hash of the current version. New clips are made with it. */
  contentHash: string;
  /** Hash of the older version 1 clips, valid while it still matches. Unset
   *  for subjects that no longer accept version 1 clips. */
  legacyHash?: string;
  loadScript: () => Promise<{ script: string; language: CollectionLanguage } | null>;
};

export type AudioResult =
  | { status: "ready"; job: AudioJob; generation?: { calls: ProviderCall[] } }
  | { status: "pending" }
  | { status: "capped" }
  | { status: "insufficient" }
  | { status: "unavailable"; generation?: { calls: ProviderCall[] } };
