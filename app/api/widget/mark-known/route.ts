import { NextResponse } from "next/server";
import { z } from "zod";
import { applyKnownToggle } from "@/lib/jargon/review-outcome";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";

const bodySchema = z.object({
  termId: z.string().uuid(),
});

export async function POST(request: Request) {
  const auth = await authenticateWidgetRequest(request);
  if ("error" in auth) return auth.error;

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    await applyKnownToggle(auth.admin, auth.userId, body.termId, true, "admin");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't mark that term as known.";
    if (message.includes("not in review pool")) {
      return NextResponse.json({ error: "Term not in your active review pool." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
