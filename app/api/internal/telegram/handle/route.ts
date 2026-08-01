import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateInternalTelegramRequest } from "@/lib/telegram/auth-internal";
import { handleTelegramUpdate } from "@/lib/telegram/flows";

const updateSchema = z.object({
  message: z
    .object({
      chatId: z.number(),
      text: z.string(),
    })
    .optional(),
  callbackQuery: z
    .object({
      id: z.string(),
      data: z.string(),
      chatId: z.number(),
      messageId: z.number(),
      messageText: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const auth = authenticateInternalTelegramRequest(request);
  if ("error" in auth) return auth.error;

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await request.json());
  } catch (err) {
    console.error("telegram handle invalid body:", err);
    return NextResponse.json(
      { error: "Invalid request body.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const actions = await handleTelegramUpdate(admin, body);
    return NextResponse.json({ actions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("telegram handle error:", err);
    return NextResponse.json(
      { error: "Internal error.", code: "HANDLE_FAILED", detail: message },
      { status: 500 },
    );
  }
}
