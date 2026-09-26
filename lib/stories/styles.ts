export type StyleOption = { id: string; label: string; prompt: string };

export const STORY_FORMATS: readonly StyleOption[] = [
  { id: "short-story", label: "Short story", prompt: "a short narrative story with a clear arc" },
  {
    id: "slack-thread",
    label: "Slack thread",
    prompt: "a Slack thread between a few colleagues, one message per paragraph as 'Name: text'",
  },
  { id: "blog-post", label: "Blog post", prompt: "a short blog post with a hook and a takeaway" },
  {
    id: "news-brief",
    label: "News brief",
    prompt: "a brief news article with a headline-style lede",
  },
  {
    id: "incident-postmortem",
    label: "Incident postmortem",
    prompt: "an incident postmortem with a summary, timeline, and lessons learned",
  },
  { id: "email", label: "Email", prompt: "a work email from one colleague to another" },
  {
    id: "meeting-notes",
    label: "Meeting notes",
    prompt: "meeting notes with short sections for discussion, decisions, and next steps",
  },
  {
    id: "interview",
    label: "Interview Q&A",
    prompt: "an interview written as alternating questions and answers",
  },
];

export const STORY_TONES: readonly StyleOption[] = [
  { id: "casual", label: "Casual", prompt: "casual and friendly" },
  { id: "neutral", label: "Neutral", prompt: "neutral and clear" },
  { id: "formal", label: "Formal", prompt: "formal and precise" },
  { id: "humorous", label: "Humorous", prompt: "light and humorous" },
  { id: "dramatic", label: "Dramatic", prompt: "dramatic, with some tension" },
];

export function findFormat(id: string): StyleOption | undefined {
  return STORY_FORMATS.find((option) => option.id === id);
}

export function findTone(id: string): StyleOption | undefined {
  return STORY_TONES.find((option) => option.id === id);
}
