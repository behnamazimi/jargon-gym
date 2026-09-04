import { createHash } from "crypto";
import type { NarratedTermFields } from "./types";

export function computeContentHash(fields: NarratedTermFields): string {
  const canonical = JSON.stringify([
    fields.term,
    fields.definition,
    fields.example ?? "",
    fields.mental_model ?? "",
    fields.discussion ?? "",
    fields.anti_example ?? "",
    fields.controversy ?? "",
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
