import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { authenticateWidgetRequest } from "@/lib/widget/auth-request";

const bodySchema = z.object({
  termId: z.string().uuid(),
});

type AdminClient = SupabaseClient<Database>;

export async function handleWidgetTermAction(
  request: Request,
  run: (ctx: { admin: AdminClient; userId: string; termId: string }) => Promise<void>,
  fallbackError: string,
) {
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
    await run({ admin: auth.admin, userId: auth.userId, termId: body.termId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : fallbackError;
    if (message.includes("not in review pool")) {
      return NextResponse.json({ error: "Term not in your active review pool." }, { status: 403 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
