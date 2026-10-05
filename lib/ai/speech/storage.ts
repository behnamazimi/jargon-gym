import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, isMissingObject } from "@/lib/supabase/s3";

function getBucket(): string {
  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) throw new Error("Missing SUPABASE_S3_BUCKET.");
  return bucket;
}

export async function uploadAudio(path: string, audio: Buffer): Promise<void> {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: path,
      Body: audio,
      ContentType: "audio/mpeg",
    }),
  );
}

export class AudioMissingError extends Error {
  constructor(path: string) {
    super(`Audio missing at ${path}.`);
    this.name = "AudioMissingError";
  }
}

export type AudioStream = {
  stream: ReadableStream<Uint8Array>;
  contentLength?: number;
  contentRange?: string;
  partial: boolean;
};

/** Streams the object straight from S3 instead of buffering it in memory,
 *  so the response can start flowing to the client immediately. `range` is
 *  the raw incoming `Range` header, passed through so the caller can serve
 *  partial content (and so `<audio>` seeking works). */
export async function downloadAudio(path: string, range?: string): Promise<AudioStream> {
  const client = getS3Client();
  let response;
  try {
    response = await client.send(
      new GetObjectCommand({ Bucket: getBucket(), Key: path, Range: range }),
    );
  } catch (error) {
    if (isMissingObject(error)) throw new AudioMissingError(path);
    throw error;
  }
  const { Body, ContentLength, ContentRange, $metadata } = response;
  if (!Body) throw new AudioMissingError(path);
  return {
    stream: Body.transformToWebStream(),
    contentLength: ContentLength,
    contentRange: ContentRange,
    partial: $metadata.httpStatusCode === 206,
  };
}

/** Removing a key that is already gone succeeds, so a repeated sweep is safe. */
export async function deleteAudio(path: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: path }));
}
