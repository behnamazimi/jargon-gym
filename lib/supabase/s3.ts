import { S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | undefined;

/** Supabase Storage through its S3-compatible endpoint. The keys reach every bucket. */
export function getS3Client(): S3Client {
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

export function isMissingObject(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
  return error.name === "NoSuchKey" || error.name === "NotFound" || status === 404;
}
