import { AdminAiHubClient } from "@/components/jargon/admin/admin-ai-hub";
import { requireAdminPage } from "@/lib/admin/page-guard";
import { buildAiHubRows } from "@/lib/admin/ai-hub";
import { featureHealth } from "@/lib/ai/health";
import { FEATURE_IDS } from "@/lib/ai/registry";

export default async function AdminAiPage() {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("ai_feature_settings")
    .select("feature, enabled, credit_cost, daily_cap")
    .in("feature", [...FEATURE_IDS]);
  if (error) console.error("Couldn't read AI feature settings:", error);

  return <AdminAiHubClient rows={buildAiHubRows(error ? null : data, featureHealth)} />;
}
