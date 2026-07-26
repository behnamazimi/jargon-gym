import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.LLM_SETTINGS_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing LLM_SETTINGS_ENCRYPTION_KEY environment variable.");
  }

  return scryptSync(secret, "jargon-gym-llm-settings", KEY_LENGTH);
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export function decryptApiKey(payload: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(payload, "base64url");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function maskApiKeyLast4(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) return trimmed;
  return trimmed.slice(-4);
}
