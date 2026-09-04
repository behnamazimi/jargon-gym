import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const SIGNED_URL_TTL_SECONDS = 600;

function getBucket(): string {
  const bucket = process.env.SUPABASE_S3_BUCKET;
  if (!bucket) throw new Error("Missing SUPABASE_S3_BUCKET.");
  return bucket;
}

function getS3Client(): S3Client {
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

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
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

export async function getSignedNarrationUrl(path: string): Promise<string> {
  const client = getS3Client();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: getBucket(), Key: path }), {
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
