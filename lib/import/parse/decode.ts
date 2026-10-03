export type DecodedFile = { kind: "json" | "text"; text: string } | { kind: "package"; text: "" };

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function decodeUtf8Strict(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Reads a file's bytes as text. UTF-8 first, UTF-16 when a byte-order mark
 *  says so, Windows-1252 otherwise, so accents survive an old Excel export. */
export function decodeFileBytes(bytes: Uint8Array): DecodedFile {
  if (startsWith(bytes, [0x50, 0x4b])) return { kind: "package", text: "" };

  let text: string;
  if (startsWith(bytes, [0xff, 0xfe])) {
    text = new TextDecoder("utf-16le").decode(bytes);
  } else if (startsWith(bytes, [0xfe, 0xff])) {
    text = new TextDecoder("utf-16be").decode(bytes);
  } else {
    text = decodeUtf8Strict(bytes) ?? new TextDecoder("windows-1252").decode(bytes);
  }

  const first = text.replace(/^﻿/, "").trimStart()[0];
  return { kind: first === "{" || first === "[" ? "json" : "text", text };
}
