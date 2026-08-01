/**
 * Thin cron proxy: verify auth → forward to Next.js → execute Telegram actions.
 */

import { getAppBaseUrl, getCronSecret, getInternalSecret } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";
import { executeTelegramActions, type TelegramAction } from "../_shared/telegram-api.ts";

function verifyCronAuth(request: Request) {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] === getCronSecret();
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const base = getAppBaseUrl();
    const response = await fetch(`${base}/api/internal/telegram/send-due`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getInternalSecret()}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Next send-due failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as {
      actions?: TelegramAction[];
      sent?: number;
      caughtUp?: number;
    };

    const supabase = createServiceClient();
    await executeTelegramActions(json.actions ?? [], supabase);

    return new Response(
      JSON.stringify({
        ok: true,
        sent: json.sent ?? 0,
        caughtUp: json.caughtUp ?? 0,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("telegram-send-due error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
