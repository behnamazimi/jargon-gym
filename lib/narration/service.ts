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

export async function getOrGenerateNarration(
  admin: AdminClient,
  termId: string,
): Promise<NarrationResult> {
  const { data: term, error: termError } = await admin
    .from("terms")
    .select(
      "term, definition, example, mental_model, discussion, anti_example, controversy, domains(language)",
    )
    .eq("id", termId)
    .single();
  if (termError || !term) return { status: "unavailable" };

  const { domains, ...fields } = term;
  const language = (domains?.language as DomainLanguage | undefined) ?? DEFAULT_LANGUAGE;
  const contentHash = computeContentHash(fields);

  const { data: existing } = await admin
    .from("term_narrations")
    .select("status, content_hash, storage_path")
    .eq("term_id", termId)
    .maybeSingle();

  if (
    existing?.status === "ready" &&
    existing.content_hash === contentHash &&
    existing.storage_path
  ) {
    return { status: "ready", storagePath: existing.storage_path, contentHash }; // cache hit — no ElevenLabs call
  }

  const { data: claimed } = await admin.rpc("claim_term_narration", {
    p_term_id: termId,
    p_content_hash: contentHash,
  });

  if (Array.isArray(claimed) && claimed.length > 0) {
    return generateAndFinalize(admin, termId, contentHash, fields, language); // we won the claim
  }

  return pollForResult(admin, termId, contentHash); // someone else is generating — wait
}
