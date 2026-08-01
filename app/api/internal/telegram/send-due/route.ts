import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authenticateInternalTelegramRequest } from "@/lib/telegram/auth-internal";
import { handleSendDue } from "@/lib/telegram/flows";

export async function POST(request: Request) {
  const auth = authenticateInternalTelegramRequest(request);
  if ("error" in auth) return auth.error;

  try {
    const admin = createAdminClient();
    const result = await handleSendDue(admin);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("telegram send-due error:", err);
    return NextResponse.json(
      { error: "Internal error.", code: "SEND_DUE_FAILED", detail: message },
      { status: 500 },
    );
  }
}
