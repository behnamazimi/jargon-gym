import { MAX_IMPORT_TERMS } from "./commit-schema";
import { formatMegabytes, MAX_COMMIT_BYTES } from "./commit-size";
import type { ImportFailure } from "./types";

const TITLE = "Couldn't add your terms";

const GENERIC: ImportFailure = {
  title: TITLE,
  message: "Couldn't add your terms. Nothing was added, and your list is still here. Try again.",
};

/** Turns what the commit function raised into plain copy. Nothing from the
 *  database is shown as it is. */
export function commitFailureFor(
  error: { message?: string } | null | undefined,
  name?: string,
): ImportFailure {
  const text = error?.message ?? "";

  if (text.includes("collection_name_taken")) {
    return {
      title: TITLE,
      message: `You already have a collection named "${name ?? "that"}". Pick another name, or add to it.`,
    };
  }
  if (text.includes("destination_not_found")) {
    return { title: TITLE, message: "That collection isn't available any more. Choose another." };
  }
  if (text.includes("import_too_large")) {
    return {
      title: TITLE,
      message: `One import adds up to ${MAX_IMPORT_TERMS} terms, so split your list and add it in parts.`,
    };
  }
  if (text.includes("Not authenticated")) {
    return { title: "Not logged in", message: "Log in to add terms." };
  }
  return GENERIC;
}

export function tooBigFailure(bytes: number): ImportFailure {
  return {
    title: TITLE,
    message: `These terms come to ${formatMegabytes(bytes)}, and one import can send up to ${formatMegabytes(MAX_COMMIT_BYTES)}. Split your list and add it in parts. Nothing was added, and your list is still here.`,
  };
}

export const OFFLINE_FAILURE: ImportFailure = {
  title: TITLE,
  message: "You're offline. Connect and try again. Your list is saved on this phone.",
};
