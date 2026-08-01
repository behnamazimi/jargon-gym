export type TermPoolStatus = "known" | "unknown";

export type StudyScope = {
  domainIds: string[] | "all";
};

export type StudyCollection = {
  id: string;
  name: string;
  knownCount: number;
  unknownCount: number;
};

export const MAX_STUDY_TERMS = 30;

export type StudyAuthMode = "session" | "admin";
