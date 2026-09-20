import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function getBucket(): string {
  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) throw new Error("Missing SUPABASE_S3_BUCKET.");
  return bucket;
}

let s3Client: S3Client | undefined;

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const endpoint = process.env.SUPABASE_S3_ENDPOINT;
  const region = process.env.SUPABASE_S3_REGION;
  const accessKeyId = process.env.SUPABASE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    const missing = [
      !endpoint ? "SUPABASE_S3_ENDPOINT" : null,
      !region ? "SUPABASE_S3_REGION" : null,
      !accessKeyId ? "SUPABASE_S3_ACCESS_KEY_ID" : null,
      !secretAccessKey ? "SUPABASE_S3_SECRET_ACCESS_KEY" : null,
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Missing ${missing}.`);
  }

  s3Client = new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
  return s3Client;
}

export async function uploadNarrationAudio(path: string, audio: Buffer): Promise<void> {
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

export type NarrationAudioStream = {
  stream: ReadableStream<Uint8Array>;
  contentLength?: number;
  contentRange?: string;
  partial: boolean;
};

/** Streams the object straight from S3 instead of buffering it in memory,
 *  so the response can start flowing to the client immediately. `range` is
 *  the raw incoming `Range` header, passed through so the caller can serve
 *  partial content (and so `<audio>` seeking works). */
export async function downloadNarrationAudio(
  path: string,
  range?: string,
): Promise<NarrationAudioStream> {
  const client = getS3Client();
  const { Body, ContentLength, ContentRange, $metadata } = await client.send(
    new GetObjectCommand({ Bucket: getBucket(), Key: path, Range: range }),
  );
  if (!Body) throw new Error(`Narration audio missing at ${path}.`);
  return {
    stream: Body.transformToWebStream(),
    contentLength: ContentLength,
    contentRange: ContentRange,
    partial: $metadata.httpStatusCode === 206,
  };
}
