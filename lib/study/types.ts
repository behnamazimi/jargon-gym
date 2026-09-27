export type StudyScope = {
  domainIds: string[] | "all";
};

export type StudyCollection = {
  id: string;
  name: string;
  termCount: number;
};

export type PausedStudyCollection = {
  id: string;
  name: string;
};

export const MAX_STUDY_TERMS = 30;

export type StudyAuthMode = "session" | "admin";
