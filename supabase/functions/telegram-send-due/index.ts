import { CAUGHT_UP_MESSAGE } from "../_shared/constants.ts";
import { getCronSecret } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase-admin.ts";
import { buildInlineKeyboard, formatTermMessage, sendMessage } from "../_shared/telegram-api.ts";
import { fetchUnknownTermCount, pickRandomUnknownTerm } from "../_shared/term-service.ts";

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
    const supabase = createServiceClient();
    const { data: dueUsers, error } = await supabase.rpc("list_due_telegram_users");

    if (error) throw error;

    let sent = 0;
    let caughtUp = 0;

    for (const row of dueUsers ?? []) {
      const userId = row.user_id as string;
      const chatId = Number(row.chat_id);

      const { data: linkRow, error: linkError } = await supabase
        .from("telegram_links")
        .select("all_caught_up_at")
        .eq("user_id", userId)
        .single();

      if (linkError) {
        console.error("Failed to load telegram link:", linkError);
        continue;
      }

      const unknownCount = await fetchUnknownTermCount(supabase, userId);

      if (unknownCount === 0) {
        if (linkRow.all_caught_up_at) {
          continue;
        }

        await sendMessage(chatId, CAUGHT_UP_MESSAGE);
        await supabase.rpc("set_telegram_all_caught_up", { p_user_id: userId });
        await supabase.rpc("record_telegram_send", { p_user_id: userId });
        caughtUp += 1;
        continue;
      }

      const term = await pickRandomUnknownTerm(supabase, userId);
      if (!term) {
        if (!linkRow.all_caught_up_at) {
          await sendMessage(chatId, CAUGHT_UP_MESSAGE);
          await supabase.rpc("set_telegram_all_caught_up", { p_user_id: userId });
          caughtUp += 1;
        }
        await supabase.rpc("record_telegram_send", { p_user_id: userId });
        continue;
      }

      await supabase
        .from("telegram_links")
        .update({ all_caught_up_at: null, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      await sendMessage(chatId, formatTermMessage(term), buildInlineKeyboard(term));
      await supabase.rpc("record_telegram_send", { p_user_id: userId });
      sent += 1;
    }

    return new Response(JSON.stringify({ ok: true, sent, caughtUp }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("telegram-send-due error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
