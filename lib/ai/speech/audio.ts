import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { CURRENT_HASH_VERSION } from "@/lib/narration/content-hash-v2";
import { claimJob, getLiveJob, markFailed, markReady, objectPathFor, setJobPath } from "./jobs";
import { synthesizeSpeech } from "./provider";
import { deleteAudio, uploadAudio } from "./storage";
import type { AudioJob, AudioResult, SpeechSubject } from "./types";

type Client = SupabaseClient<Database>;

const POLL_INTERVAL_MS = 750;
/** A pending job older than this is treated as abandoned (the claim function
 *  uses the same two minutes). */
const PENDING_FRESH_MS = 2 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A ready clip is current while its own hash still matches. A version 1 clip
 *  stays valid under the older hash until an admin regenerates it. */
export function isCurrentJob(
  job: Pick<AudioJob, "status" | "storage_path" | "hash_version" | "content_hash">,
  subject: Pick<SpeechSubject, "contentHash" | "legacyHash">,
): boolean {
  if (job.status !== "ready" || !job.storage_path) return false;
  if (job.hash_version === 1) return job.content_hash === subject.legacyHash;
  return job.hash_version === CURRENT_HASH_VERSION && job.content_hash === subject.contentHash;
}

/** Read-only: the current clip if there is one. Never claims or generates. */
export async function getReadyAudio(
  admin: Client,
  subject: SpeechSubject,
): Promise<AudioJob | null> {
  const job = await getLiveJob(admin, subject);
  if (!job || !isCurrentJob(job, subject)) return null;
  if (subject.type === "story" && job.user_id !== subject.userId) return null;
  return job;
}

function isFresh(job: AudioJob): boolean {
  return Date.now() - Date.parse(job.requested_at) < PENDING_FRESH_MS;
}

/** Someone else is making the clip. Re-reads the live job each time (it may
 *  have been replaced), and gives up when it fails, disappears or time runs
 *  out. With no time to wait, an unfinished clip is just pending. */
async function awaitLiveJob(
  admin: Client,
  subject: SpeechSubject,
  waitMs: number,
): Promise<AudioResult> {
  const deadline = Date.now() + waitMs;
  while (true) {
    const live = await getLiveJob(admin, subject);
    if (live && isCurrentJob(live, subject)) return { status: "ready", job: live };
    if (!live || live.status === "failed") return { status: "unavailable" };
    if (Date.now() >= deadline) return { status: "pending" };
    await sleep(POLL_INTERVAL_MS);
  }
}

async function generate(
  admin: Client,
  subject: SpeechSubject,
  job: AudioJob,
): Promise<AudioResult> {
  let units = 0;
  let path: string | null = null;
  try {
    const loaded = await subject.loadScript();
    if (!loaded) throw new Error("Nothing to narrate.");
    units = loaded.script.length;

    path = await objectPathFor(admin, job);
    if (!(await setJobPath(admin, job.id, path))) return { status: "pending" };

    const audio = await synthesizeSpeech(loaded.script, loaded.language);
    await uploadAudio(path, audio);

    if (!(await markReady(admin, job.id))) {
      await deleteAudio(path).catch((err) =>
        console.error("Couldn't remove a superseded clip:", err),
      );
      return { status: "pending" };
    }
    return {
      status: "ready",
      job: { ...job, status: "ready", storage_path: path },
      generation: { units },
    };
  } catch (err) {
    console.error("Audio generation failed:", err);
    await markFailed(admin, job.id, err instanceof Error ? err.message : String(err));
    return { status: "unavailable", generation: { units } };
  }
}

export type CreateAudioOptions = {
  /** How long to wait for someone else's generation. Zero answers `pending`. */
  waitMs?: number;
  /** Makes a new clip even when the current one is fine. */
  regenerate?: boolean;
  /** Asked only when a new clip is about to be made, so a cache hit or a
   *  generation in progress never counts against a cap. */
  allowGeneration?: () => Promise<boolean>;
};

export async function getOrCreateAudio(
  admin: Client,
  subject: SpeechSubject,
  options: CreateAudioOptions = {},
): Promise<AudioResult> {
  const { waitMs = 0, regenerate = false, allowGeneration } = options;

  const live = await getLiveJob(admin, subject);
  if (live && !regenerate && isCurrentJob(live, subject)) return { status: "ready", job: live };
  if (live?.status === "pending" && isFresh(live)) return awaitLiveJob(admin, subject, waitMs);

  if (allowGeneration && !(await allowGeneration())) return { status: "capped" };

  const claimed = await claimJob(admin, subject, regenerate);
  if (!claimed) return awaitLiveJob(admin, subject, waitMs);
  return generate(admin, subject, claimed);
}
