import type { DomainLanguage } from "@/lib/terms/languages";

export type SpeechProvider = "murf" | "elevenlabs";

export type SynthesisRequest = {
  /** May contain NARRATION_PAUSE, which each provider writes its own way. */
  script: string;
  language: DomainLanguage;
  kind: "term" | "story";
};

export type SpeechProviderAdapter = {
  id: SpeechProvider;
  isConfigured: () => boolean;
  synthesize: (request: SynthesisRequest) => Promise<Buffer>;
};
