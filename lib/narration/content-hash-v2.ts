import { createHash } from "node:crypto";
import type { DomainLanguage } from "@/lib/terms/languages";
import type { NarratedTermFields } from "./types";

/** Bump when the wording in template.ts changes, so cached clips are remade. */
const NARRATION_TEMPLATE_VERSION = 1;

/**
 * Version 2 of the narration content hash: the narrated fields plus the
 * language and the template version, so a language change or a template edit
 * regenerates the clip. Version 1 (content-hash.ts) covers the fields only;
 * clips made under it stay valid until an admin chooses to regenerate them.
 */
export function computeContentHashV2(fields: NarratedTermFields, language: DomainLanguage): string {
  const canonical = JSON.stringify([
    2,
    NARRATION_TEMPLATE_VERSION,
    language,
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

/** The hash version new audio jobs are made with. */
export const CURRENT_HASH_VERSION = 2;
