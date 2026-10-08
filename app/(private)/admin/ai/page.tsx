import { AdminAiHubClient } from "@/components/admin/ai/ai-hub";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { buildAiHubRows, type AiPriceRow } from "@/lib/admin/ai-hub";
import { featureHealth } from "@/lib/ai/health";
import { FEATURE_IDS } from "@/lib/ai/registry";

export default async function AdminAiPage() {
  const { supabase } = await requireAdminPage();

  const [{ data, error }, { data: prices, error: pricesError }] = await Promise.all([
    supabase
      .from("ai_feature_settings")
      .select("feature, enabled, daily_cap")
      .in("feature", [...FEATURE_IDS]),
    supabase
      .from("credit_prices")
      .select("feature, base_credits, credits_per_unit, unit_size, effective_from")
      .lte("effective_from", new Date().toISOString())
      .order("effective_from", { ascending: false }),
  ]);
  if (error) console.error("Couldn't read AI feature settings:", error);
  if (pricesError) console.error("Couldn't read credit prices:", pricesError);

  // Newest row first, so the first row per feature is the price in effect.
  const current = new Map<string, AiPriceRow>();
  for (const row of prices ?? []) {
    if (!current.has(row.feature)) {
      current.set(row.feature, {
        feature: row.feature,
        base_credits: Number(row.base_credits),
        credits_per_unit: Number(row.credits_per_unit),
        unit_size: row.unit_size,
      });
    }
  }

  return (
    <AdminAiHubClient
      rows={buildAiHubRows(error ? null : data, featureHealth, [...current.values()])}
    />
  );
}
