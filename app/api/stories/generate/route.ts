import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { storyFailure } from "@/lib/stories/failure";
import type { StoryStreamEvent } from "@/lib/stories/stream";
import { writeStory } from "@/lib/stories/write-story";

// Writing the story, saving it and refunding on a failure all happen inside this request.
export const maxDuration = 60;

const LOGIN_ERROR = "Log in to continue.";

/** Writes a story and streams it to the client as it is written: one JSON event
 *  per line (see StoryStreamEvent), ending in either `done` or `error`. The
 *  work finishes even if the client leaves, so the story is saved (or the credits
 *  refunded) either way. */
export async function POST(request: Request) {
  const auth = await requireAuthenticatedClient();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: StoryStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };

      try {
        if ("error" in auth) {
          send({ type: "error", error: LOGIN_ERROR });
          return;
        }
        const input: unknown = await request.json().catch(() => null);
        const result = await writeStory(auth, input, {
          onText: (text) => send({ type: "text", text }),
          onRetry: () => send({ type: "reset" }),
        });
        send("error" in result ? { type: "error", ...result } : { type: "done", ...result });
      } catch (err) {
        send({ type: "error", ...storyFailure(err) });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
