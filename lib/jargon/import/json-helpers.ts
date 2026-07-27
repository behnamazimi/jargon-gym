import { formatJsonFailure } from "./errors";
import type { ImportFailure } from "./types";

export function formatImportJson(
  raw: string,
): { ok: true; formatted: string } | { ok: false; failure: ImportFailure } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      ok: false,
      failure: {
        title: "Nothing to format",
        message: "Paste JSON before formatting.",
      },
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return { ok: true, formatted: `${JSON.stringify(parsed, null, 2)}\n` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax";
    return { ok: false, failure: formatJsonFailure(message) };
  }
}

export function readJsonFile(
  file: File,
): Promise<{ ok: true; contents: string } | { ok: false; failure: ImportFailure }> {
  if (!file.name.toLowerCase().endsWith(".json") && file.type && file.type !== "application/json") {
    return Promise.resolve({
      ok: false,
      failure: {
        title: "Unsupported file",
        message: `"${file.name}" does not look like a JSON file.`,
        hint: "Choose a .json file or paste the contents manually.",
      },
    });
  }

  return file.text().then(
    (contents) => {
      if (!contents.trim()) {
        return {
          ok: false,
          failure: {
            title: "Empty file",
            message: `"${file.name}" is empty.`,
          },
        };
      }

      return { ok: true, contents };
    },
    () => ({
      ok: false,
      failure: {
        title: "Could not read file",
        message: `Couldn't read "${file.name}". Try another file or paste the JSON manually.`,
      },
    }),
  );
}
