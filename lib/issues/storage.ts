import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client, isMissingObject } from "@/lib/supabase/s3";

const BUCKET = "issue-screenshots";

export function screenshotKey(userId: string, issueId: string): string {
  return `${userId}/${issueId}.webp`;
}

export async function uploadScreenshot(key: string, bytes: Uint8Array): Promise<void> {
  await getS3Client().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: "image/webp" }),
  );
}

/** Null when the file is gone. */
export async function streamScreenshot(
  key: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentLength?: number } | null> {
  try {
    const { Body, ContentLength } = await getS3Client().send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    if (!Body) return null;
    return { stream: Body.transformToWebStream(), contentLength: ContentLength };
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

export async function deleteScreenshot(key: string): Promise<void> {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Removes every screenshot a person sent. Their rows go with the account. */
export async function deleteUserScreenshots(userId: string): Promise<void> {
  const client = getS3Client();
  let token: string | undefined;
  do {
    const page = await client.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${userId}/`, ContinuationToken: token }),
    );
    const keys = (page.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []));
    if (keys.length > 0) {
      await client.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys } }));
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}
