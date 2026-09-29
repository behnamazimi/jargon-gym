import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CURRENT_HASH_VERSION } from "@/lib/narration/content-hash-v2";
import type { AudioJob, SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

const ERROR_MAX_LENGTH = 200;

/** The one job for this subject that is not superseded. */
export async function getLiveJob(admin: Client, subject: SpeechSubject): Promise<AudioJob | null> {
  const { data, error } = await admin
    .from("audio_jobs")
    .select("*")
    .eq("subject_type", subject.type)
    .eq("subject_id", subject.id)
    .neq("status", "superseded")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The new pending job when this caller won the claim, otherwise null. */
export async function claimJob(
  admin: Client,
  subject: SpeechSubject,
  regenerate: boolean,
): Promise<AudioJob | null> {
  const { data, error } = await admin.rpc("claim_audio_job", {
    p_subject_type: subject.type,
    p_subject_id: subject.id,
    // Terms have no owner; the generated type does not allow null.
    p_user_id: subject.userId as string,
    p_content_hash: subject.contentHash,
    p_hash_version: CURRENT_HASH_VERSION,
    p_regenerate: regenerate,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function objectPathFor(admin: Client, job: AudioJob): Promise<string> {
  const { data, error } = await admin.rpc("audio_job_object_path", {
    p_job_id: job.id,
    p_subject_type: job.subject_type,
    p_subject_id: job.subject_id,
    p_hash_version: job.hash_version,
    p_content_hash: job.content_hash,
  });
  if (error) throw error;
  return data;
}

/** Recorded before the upload, so a file left behind by a request that died
 *  can be found and removed. False when the job was superseded meanwhile. */
export async function setJobPath(admin: Client, jobId: string, path: string): Promise<boolean> {
  const { data, error } = await admin
    .from("audio_jobs")
    .update({ storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** False when the job was superseded while the clip was being made. */
export async function markReady(admin: Client, jobId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("audio_jobs")
    .update({ status: "ready", error: null, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function markFailed(admin: Client, jobId: string, message: string): Promise<void> {
  await admin
    .from("audio_jobs")
    .update({
      status: "failed",
      error: message.slice(0, ERROR_MAX_LENGTH),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "pending");
}

/** The job says ready but the file is gone. Failing it lets the next explicit
 *  prepare claim a new one. */
export async function markFileMissing(admin: Client, jobId: string): Promise<void> {
  await admin
    .from("audio_jobs")
    .update({
      status: "failed",
      error: "Audio file is missing.",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "ready");
}
