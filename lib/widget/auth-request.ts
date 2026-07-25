import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromToken } from "@/lib/widget/tokens";

export async function authenticateWidgetRequest(request: Request) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return {
      error: NextResponse.json({ error: "Missing Authorization header." }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const userId = await resolveUserFromToken(admin, token);

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Invalid or revoked token." }, { status: 401 }),
    };
  }

  return { admin, userId };
}
