export function getAppBaseUrl(): string {
  return (
    Deno.env.get("APP_BASE_URL") ??
    Deno.env.get("WIDGET_PRODUCTION_URL") ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getTelegramBotToken(): string {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  return token;
}

export function getWebhookSecret(): string {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (!secret) throw new Error("Missing TELEGRAM_WEBHOOK_SECRET.");
  return secret;
}

export function getCronSecret(): string {
  const secret = Deno.env.get("TELEGRAM_CRON_SECRET");
  if (!secret) throw new Error("Missing TELEGRAM_CRON_SECRET.");
  return secret;
}

export function getInternalSecret(): string {
  const secret = Deno.env.get("TELEGRAM_INTERNAL_SECRET");
  if (!secret) throw new Error("Missing TELEGRAM_INTERNAL_SECRET.");
  return secret;
}
