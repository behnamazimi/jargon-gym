import type { SupabaseClient } from "@supabase/supabase-js";
import type { DomainLanguage } from "@/lib/jargon/languages";
import type { Database } from "@/lib/supabase/database.types";
import { computeContentHash } from "./content-hash";
import { synthesizeNarrationAudio } from "./eleven-labs";
import { uploadNarrationAudio } from "./storage";
import { buildNarrationScript } from "./template";
import type { NarratedTermFields, NarrationResult } from "./types";

type AdminClient = SupabaseClient<Database>;

const DEFAULT_LANGUAGE: DomainLanguage = "en";

const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 30_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pathForTerm(termId: string): string {
  return `${termId}.mp3`;
}

async function pollForResult(
  admin: AdminClient,
  termId: string,
  contentHash: string,
): Promise<NarrationResult> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const { data: row } = await admin
      .from("term_narrations")
      .select("status, content_hash, storage_path")
      .eq("term_id", termId)
      .maybeSingle();
    if (!row || row.content_hash !== contentHash) return { status: "unavailable" }; // superseded
    if (row.status === "ready" && row.storage_path)
      return { status: "ready", storagePath: row.storage_path, contentHash };
    if (row.status === "failed") return { status: "unavailable" };
    // still 'pending' — keep polling
  }
  return { status: "unavailable" };
}

async function generateAndFinalize(
  admin: AdminClient,
  termId: string,
  contentHash: string,
  fields: NarratedTermFields,
  language: DomainLanguage,
): Promise<NarrationResult> {
  const path = pathForTerm(termId);
  try {
    const script = buildNarrationScript(fields, language);
    const audio = await synthesizeNarrationAudio(script, language);

    await uploadNarrationAudio(path, audio);

    await admin
      .from("term_narrations")
      .update({ status: "ready", storage_path: path })
      .eq("term_id", termId)
      .eq("content_hash", contentHash); // guard: don't clobber a newer claim

    return { status: "ready", storagePath: path, contentHash };
  } catch (err) {
    console.error("Narration generation failed:", err);
    await admin
      .from("term_narrations")
      .update({ status: "failed" })
      .eq("term_id", termId)
      .eq("content_hash", contentHash);
    return { status: "unavailable" };
  }
}

const NARRATED_FIELD_COLUMNS =
  "term, definition, example, mental_model, discussion, anti_example, controversy";

async function fetchNarratedFields(
  admin: AdminClient,
  termId: string,
): Promise<{ fields: NarratedTermFields; contentHash: string } | null> {
  const { data: fields, error } = await admin
    .from("terms")
    .select(NARRATED_FIELD_COLUMNS)
    .eq("id", termId)
    .single();
  if (error || !fields) return null;
  return { fields, contentHash: computeContentHash(fields) };
}

async function fetchDomainLanguage(admin: AdminClient, termId: string): Promise<DomainLanguage> {
  const { data } = await admin.from("terms").select("domains(language)").eq("id", termId).single();
  return (data?.domains?.language as DomainLanguage | undefined) ?? DEFAULT_LANGUAGE;
}

type ExistingNarration = { status: string; content_hash: string; storage_path: string | null };

/** cache hit — no ElevenLabs call */
function getCachedResult(
  existing: ExistingNarration | null | undefined,
  contentHash: string,
): NarrationResult | null {
  if (
    existing?.status === "ready" &&
    existing.content_hash === contentHash &&
    existing.storage_path
  ) {
    return { status: "ready", storagePath: existing.storage_path, contentHash };
  }
  return null;
}

function wonClaim(claimed: unknown): boolean {
  return Array.isArray(claimed) && claimed.length > 0;
}

export async function getOrGenerateNarration(
  admin: AdminClient,
  termId: string,
): Promise<NarrationResult> {
  const [termData, { data: existing }] = await Promise.all([
    fetchNarratedFields(admin, termId),
    admin
      .from("term_narrations")
      .select("status, content_hash, storage_path")
      .eq("term_id", termId)
      .maybeSingle(),
  ]);
  if (!termData) return { status: "unavailable" };
  const { fields, contentHash } = termData;

  const cached = getCachedResult(existing, contentHash);
  if (cached) return cached;

  const language = await fetchDomainLanguage(admin, termId);

  const { data: claimed } = await admin.rpc("claim_term_narration", {
    p_term_id: termId,
    p_content_hash: contentHash,
  });

  if (wonClaim(claimed)) {
    return generateAndFinalize(admin, termId, contentHash, fields, language); // we won the claim
  }

  return pollForResult(admin, termId, contentHash); // someone else is generating — wait
}
