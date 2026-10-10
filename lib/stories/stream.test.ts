import { describe, expect, it } from "vitest";
import { readStoryStream } from "./stream";

function streamOf(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const events = [];
  for await (const event of readStoryStream(body)) events.push(event);
  return events;
}

describe("readStoryStream", () => {
  it("reads events split across chunks", async () => {
    const events = await collect(
      streamOf(
        '{"type":"text","te',
        'xt":"Hi"}\n{"type":"reset"}\n{"type":"er',
        'ror","error":"x"}',
      ),
    );
    expect(events).toEqual([
      { type: "text", text: "Hi" },
      { type: "reset" },
      { type: "error", error: "x" },
    ]);
  });

  it("skips blank and unreadable lines", async () => {
    expect(await collect(streamOf('\nnot json\n{"type":"reset"}\n'))).toEqual([{ type: "reset" }]);
  });
});
