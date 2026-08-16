/** Shared study term-pool + collection metrics seam. */

export type { TermPoolStatus, StudyCollection } from "./types";
export { MAX_STUDY_TERMS } from "./types";

export { listStudyCollections } from "./collections";
export { countTermsForSelection, getMaxStudyCount } from "./count";
export { fetchStudyTermPool, fetchQuizTermPool } from "./pool";
