import type { CollectionLanguage } from "@/lib/terms/languages";

export type SpeechProvider = "murf" | "elevenlabs";

export type SynthesisRequest = {
  /** May contain NARRATION_PAUSE, which each provider writes its own way. */
  script: string;
  language: CollectionLanguage;
  kind: "term" | "story";
};

export type SpeechProviderAdapter = {
  id: SpeechProvider;
  isConfigured: () => boolean;
  /** False when the provider has no voice for the language, so the router skips it. */
  supports?: (language: CollectionLanguage) => boolean;
  synthesize: (request: SynthesisRequest) => Promise<Buffer>;
};
