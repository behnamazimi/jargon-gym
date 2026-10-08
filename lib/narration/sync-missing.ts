import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isCurrentJob } from "@/lib/ai/speech/audio";
import type { AudioJob } from "@/lib/ai/speech/types";
import { parseLanguage } from "@/lib/terms/languages";
import { computeContentHash } from "./content-hash";
import { computeNarrationHash } from "./content-hash-v2";
import { DEFAULT_NARRATION_MODE, getNarrationModes, type NarrationMode } from "./mode";
import type { NarrationCoverage, NarrationTermClip } from "./sync-shared";
import type { NarratedTermFields } from "./types";

type AdminClient = SupabaseClient<Database>;

export type TermRow = {
  id: string;
  collection_id: string;
  collections: { language: string } | null;
} & NarratedTermFields;

export type JobRow = Pick<
  AudioJob,
  "id" | "subject_id" | "status" | "hash_version" | "content_hash" | "storage_path"
>;

export const TERM_FIELD_COLUMNS =
  "id, collection_id, term, definition, example, mental_model, discussion, anti_example, controversy, collections(language)";

/** PostgREST's default max-rows cap. */
const PAGE_SIZE = 1000;
/** Keep `.in()` query strings under Kong/PostgREST URL limits. */
const IN_FILTER_CHUNK = 80;

function fieldsFromTerm(term: NarratedTermFields): NarratedTermFields {
  return {
    term: term.term,
    definition: term.definition,
    example: term.example,
    mental_model: term.mental_model,
    discussion: term.discussion,
    anti_example: term.anti_example,
    controversy: term.controversy,
  };
}

export function isCurrentAudio(
  term: TermRow,
  job: Omit<JobRow, "id"> | undefined,
  mode: NarrationMode,
): boolean {
  if (!job) return false;
  const fields = fieldsFromTerm(term);
  return isCurrentJob(job, {
    contentHash: computeNarrationHash(mode, fields, parseLanguage(term.collections?.language)),
    legacyHash: mode === "full" ? computeContentHash(fields) : undefined,
  });
}

/** A clip made for something that no longer matches (an edit, or the other mode) is stale. */
export type NarrationClipState = "current" | "stale" | "missing";

function narrationClipState(
  term: TermRow,
  job: Omit<JobRow, "id"> | undefined,
  mode: NarrationMode,
): NarrationClipState {
  if (isCurrentAudio(term, job, mode)) return "current";
  return job?.status === "ready" && job.storage_path ? "stale" : "missing";
}

export function chunkIds(ids: string[]): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_FILTER_CHUNK) {
    chunks.push(ids.slice(i, i + IN_FILTER_CHUNK));
  }
  return chunks;
}

async function fetchAllTermsForCollection(
  admin: AdminClient,
  collectionId: string,
): Promise<TermRow[]> {
  const terms: TermRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from("terms")
      .select(TERM_FIELD_COLUMNS)
      .eq("collection_id", collectionId)
      .not("definition", "is", null)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    terms.push(...((data ?? []) as TermRow[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return terms;
}

export async function loadLiveJobs(
  admin: AdminClient,
  termIds: string[],
): Promise<Map<string, JobRow>> {
  const byTermId = new Map<string, JobRow>();
  for (const chunk of chunkIds(termIds)) {
    const { data, error } = await admin
      .from("audio_jobs")
      .select("id, subject_id, status, hash_version, content_hash, storage_path")
      .eq("subject_type", "term")
      .neq("status", "superseded")
      .in("subject_id", chunk)
      .range(0, chunk.length * 2 - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      byTermId.set(row.subject_id, row);
    }
  }
  return byTermId;
}

export async function listMissingNarrationTermIds(
  admin: AdminClient,
  collectionId: string,
): Promise<string[]> {
  const clips = await loadCollectionClips(admin, collectionId);
  return clips.filter((clip) => clip.state !== "current").map((clip) => clip.id);
}

async function loadCollectionClips(
  admin: AdminClient,
  collectionId: string,
): Promise<NarrationTermClip[]> {
  const terms = await fetchAllTermsForCollection(admin, collectionId);
  if (terms.length === 0) return [];

  const mode =
    (await getNarrationModes(admin, [collectionId])).get(collectionId) ?? DEFAULT_NARRATION_MODE;
  const jobs = await loadLiveJobs(
    admin,
    terms.map((term) => term.id),
  );
  return terms.map((term) => ({
    id: term.id,
    term: term.term,
    state: narrationClipState(term, jobs.get(term.id), mode),
  }));
}

export async function getCollectionNarrationCoverage(
  admin: AdminClient,
  collectionId: string,
): Promise<NarrationCoverage> {
  const clips = await loadCollectionClips(admin, collectionId);
  const count = (state: NarrationClipState) => clips.filter((clip) => clip.state === state).length;
  return {
    total: clips.length,
    current: count("current"),
    stale: count("stale"),
    missing: count("missing"),
  };
}

/** One page of a collection's terms, in alphabetical order, optionally only those in one state. */
export async function listCollectionTermClips(
  admin: AdminClient,
  collectionId: string,
  options: { page: number; pageSize: number; state: NarrationClipState | "all" },
): Promise<{ clips: NarrationTermClip[]; total: number }> {
  const all = (await loadCollectionClips(admin, collectionId)).sort((a, b) =>
    a.term.localeCompare(b.term),
  );
  const filtered =
    options.state === "all" ? all : all.filter((clip) => clip.state === options.state);
  const from = (Math.max(options.page, 1) - 1) * options.pageSize;
  return { clips: filtered.slice(from, from + options.pageSize), total: filtered.length };
}
