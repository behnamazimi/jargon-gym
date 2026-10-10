import type { AiFailureReason } from "@/lib/llm/types";
import type { Story, StoryTerm } from "./types";

/** What the story route sends, one JSON object per line. */
export type StoryStreamEvent =
  | { type: "text"; text: string }
  /** The first attempt failed; the text so far is discarded. */
  | { type: "reset" }
  | { type: "done"; story: Story; terms: StoryTerm[] }
  | { type: "error"; error: string; reason?: AiFailureReason };

/** Reads the route's response line by line. A line that isn't an event is skipped. */
export async function* readStoryStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffered += decoder.decode(value, { stream: !done });
    const lines = buffered.split("\n");
    buffered = done ? "" : lines.pop()!;
    for (const line of lines) {
      const event = parseEvent(line);
      if (event) yield event;
    }
    if (done) return;
  }
}

function parseEvent(line: string): StoryStreamEvent | null {
  if (!line.trim()) return null;
  try {
    return JSON.parse(line) as StoryStreamEvent;
  } catch {
    return null;
  }
}
