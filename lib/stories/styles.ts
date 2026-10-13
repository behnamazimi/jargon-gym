export type StyleOption = { id: string; label: string; prompt: string };

export const STORY_FORMATS: readonly StyleOption[] = [
  {
    id: "short-story",
    label: "Short story",
    prompt:
      "a narrative story: one or two named characters, one small problem, one turn, ending on an action or image",
  },
  {
    id: "slack-thread",
    label: "Slack thread",
    prompt:
      "a Slack thread between a few colleagues, one message per paragraph as 'Name: text'; chatty messages that reply to each other",
  },
  {
    id: "blog-post",
    label: "Blog post",
    prompt:
      "a first-person blog post: a hook statement in the first line, one experience or idea, and a practical takeaway at the end",
  },
  {
    id: "news-brief",
    label: "News brief",
    prompt:
      "a news article in the third person and past tense: the first sentence says who, what, when and where; no dialogue, no opinion",
  },
  {
    id: "incident-postmortem",
    label: "Incident postmortem",
    prompt:
      "an incident postmortem in three parts, in order: what happened, why, and what changes now; factual and blameless",
  },
  {
    id: "email",
    label: "Email",
    prompt:
      "a work email from one colleague to another: greeting, one clear update or request, and a sign-off with the sender's name",
  },
  {
    id: "meeting-notes",
    label: "Meeting notes",
    prompt:
      "meeting notes in three sections: discussion, decisions, and next steps with who does what",
  },
  {
    id: "interview",
    label: "Interview Q&A",
    prompt:
      "an interview written as alternating questions and answers; direct questions, answers in the speaker's own voice",
  },
];

export const STORY_TONES: readonly StyleOption[] = [
  {
    id: "casual",
    label: "Casual",
    prompt:
      "casual and relaxed: the informal 'you' where the language has one, contractions, asides",
  },
  {
    id: "friendly",
    label: "Friendly",
    prompt:
      "warm and kind: people are glad to see each other, help without being asked, and thank each other",
  },
  {
    id: "neutral",
    label: "Neutral",
    prompt: "neutral and clear: plain statements, no slang, no jokes",
  },
  {
    id: "formal",
    label: "Formal",
    prompt:
      "formal and precise, but still warm and readable: the polite 'you' where the language has one, full forms, no slang",
  },
  {
    id: "humorous",
    label: "Humorous",
    prompt:
      "light and humorous: one joke that grows out of the situation and runs through the piece",
  },
  {
    id: "dramatic",
    label: "Dramatic",
    prompt:
      "tense and gripping, but believable (no melodrama): real stakes, time pressure, tension that builds to a peak",
  },
];

export function findFormat(id: string): StyleOption | undefined {
  return STORY_FORMATS.find((option) => option.id === id);
}

export function findTone(id: string): StyleOption | undefined {
  return STORY_TONES.find((option) => option.id === id);
}
