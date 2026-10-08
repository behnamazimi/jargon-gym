import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

// Stands in for Gemini, Resend, Murf and ElevenLabs so tests never reach a paid service.
// State is in memory; tests read it through the control routes under /__stub.

const FAIL_MARKER = "E2E_FAIL";
const PORT = Number(process.env.STUB_PORT ?? 3199);

type SentEmail = { to: string[]; subject: string; text: string; html: string };
type RecordedRequest = { service: string; path: string };

const outbox: SentEmail[] = [];
const requests: RecordedRequest[] = [];

// A short silent MP3 frame, enough for the narration route to store and serve.
const MP3 = Buffer.from(
  "//uQxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "base64",
);

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function geminiReply(text: string) {
  return {
    candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP", index: 0 }],
    usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 80, totalTokenCount: 200 },
  };
}

type Part = { text?: string };
type GeminiRequest = {
  contents?: { parts?: Part[] }[];
  systemInstruction?: { parts?: Part[] };
  generationConfig?: { responseSchema?: unknown };
};

function promptOf(body: GeminiRequest): string {
  return (body.contents ?? [])
    .flatMap((c) => c.parts ?? [])
    .map((p) => p.text ?? "")
    .join("\n");
}

function quizAnswer(body: GeminiRequest): string {
  const prompt = promptOf(body);
  const ids = [...prompt.matchAll(/^- id: (\S+)/gm)].map((m) => m[1]!);
  const schema = (body.generationConfig?.responseSchema ?? {}) as {
    properties?: { questions?: { properties?: Record<string, unknown> } };
  };
  const slots = schema.properties?.questions?.properties ?? {};
  const questions: Record<string, unknown> = {};
  ids.forEach((termId, index) => {
    const key = `question_${index}`;
    const shape = JSON.stringify(slots[key] ?? {});
    const quote = shape.includes('"quote"') ? { quote: "We rely on this term every day." } : {};
    questions[key] = shape.includes("true_false")
      ? { type: "true_false", termId, ...quote, correctAnswer: true }
      : {
          type: "multiple_choice",
          termId,
          ...quote,
          options: [
            { id: "a", text: "The right meaning" },
            { id: "b", text: "A wrong meaning" },
            { id: "c", text: "Another wrong meaning" },
            { id: "d", text: "Yet another wrong meaning" },
          ],
          correctOptionIds: ["a"],
        };
  });
  return JSON.stringify({ questions });
}

function storyAnswer(body: GeminiRequest): string {
  const terms = [...promptOf(body).matchAll(/^(\d+)\. ([^:\n]+):/gm)].map((m) => ({
    number: m[1]!,
    term: m[2]!.trim(),
  }));
  const sentences = terms.map(
    ({ number, term }) =>
      `The team talked about [[${term}|${number}]] for quite a long while today.`,
  );
  const half = Math.ceil(sentences.length / 2);
  const paragraphs = [sentences.slice(0, half), sentences.slice(half)].filter((p) => p.length > 0);
  return `A Day At Work\n\n${paragraphs.map((p) => p.join(" ")).join("\n\n")}`;
}

type Route = (ctx: { url: URL; path: string; raw: string; res: ServerResponse }) => void;

function control(path: string): Route | undefined {
  const routes: Record<string, Route> = {
    "/__stub/outbox": ({ res }) => json(res, 200, outbox),
    "/__stub/requests": ({ res }) => json(res, 200, requests),
    "/__stub/health": ({ res }) => json(res, 200, { ok: true }),
    "/__stub/reset": ({ res }) => {
      outbox.length = 0;
      requests.length = 0;
      json(res, 200, {});
    },
  };
  return routes[path];
}

const llm: Route = ({ path, raw, res }) => {
  requests.push({ service: "llm", path });
  const body = JSON.parse(raw) as GeminiRequest;
  // A term named with this marker makes the model call fail, so one test fails without touching others.
  if (promptOf(body).includes(FAIL_MARKER)) {
    return json(res, 500, { error: { code: 500, message: "stub failure", status: "INTERNAL" } });
  }
  json(res, 200, geminiReply(body.systemInstruction ? storyAnswer(body) : quizAnswer(body)));
};

const email: Route = ({ path, raw, res }) => {
  requests.push({ service: "resend", path });
  const body = JSON.parse(raw) as {
    to: string | string[];
    subject: string;
    text: string;
    html: string;
  };
  outbox.push({
    to: Array.isArray(body.to) ? body.to : [body.to],
    subject: body.subject,
    text: body.text,
    html: body.html,
  });
  json(res, 200, { id: `stub-${outbox.length}` });
};

const rawAudio: Route = ({ path, res }) => {
  requests.push({ service: "narration", path });
  res.writeHead(200, { "content-type": "audio/mpeg" });
  res.end(MP3);
};

const encodedAudio: Route = ({ path, res }) => {
  requests.push({ service: "narration", path });
  json(res, 200, { encodedAudio: MP3.toString("base64") });
};

function service(path: string): Route | undefined {
  if (path.includes(":generateContent")) return llm;
  if (path === "/emails") return email;
  if (path.startsWith("/v1/text-to-speech/") || path === "/v1/speech/stream") return rawAudio;
  if (path === "/v1/speech/generate") return encodedAudio;
  return undefined;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const raw = req.method === "POST" ? await readBody(req) : "";
  const route = control(url.pathname) ?? service(url.pathname);
  if (route) return route({ url, path: url.pathname, raw, res });
  json(res, 404, { error: `stub has no route for ${req.method} ${url.pathname}` });
}

createServer((req, res) => {
  handle(req, res).catch((error) => json(res, 500, { error: String(error) }));
}).listen(PORT, "127.0.0.1", () => console.log(`E2E stub listening on ${PORT}`));
