import { Suspense } from "react";
import {
  getAccountSettingsData,
  getLlmSettingsData,
  getTelegramSettingsData,
  getWidgetSettingsData,
} from "@/app/(private)/app/settings/actions";
import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import { AccountPanel } from "@/components/settings/account-panel";
import { LlmPanel } from "@/components/settings/llm-panel";
import { TelegramPanel } from "@/components/settings/telegram-panel";
import { ScrollToSettingsPanel, type SettingsTabId } from "@/components/settings/ui";
import { WidgetPanel } from "@/components/settings/widget-panel";
import { PanelSkeleton } from "@/components/page-skeleton";
import { LATEST_WIDGET_VERSION } from "@/lib/widget/version";

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(value: string | undefined): SettingsTabId | null {
  if (value === "telegram" || value === "widget" || value === "ai" || value === "account") {
    return value;
  }
  // The AI panel used to be the "quiz" tab; keep old links working.
  if (value === "quiz") return "ai";
  return null;
}

async function LlmPanelServer() {
  const setup = await getLlmSettingsData();
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }
  return <LlmPanel ai={setup.ai} costs={setup.costs} schedule={setup.schedule} />;
}

async function TelegramPanelServer() {
  const setup = await getTelegramSettingsData();
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }
  return <TelegramPanel initialStatus={setup.telegramStatus} />;
}

async function WidgetPanelServer() {
  const setup = await getWidgetSettingsData();
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }
  return (
    <WidgetPanel initialTokens={setup.widgetTokens} latestWidgetVersion={LATEST_WIDGET_VERSION} />
  );
}

async function AccountPanelServer() {
  const setup = await getAccountSettingsData();
  if ("error" in setup) {
    return <p className="text-sm text-base-content/70">{setup.error}</p>;
  }
  return <AccountPanel {...setup.account} />;
}

export default async function SettingsRoute({ searchParams }: PageProps) {
  const [{ tab: tabParam }, auth] = await Promise.all([searchParams, requireAuthenticatedClient()]);

  if ("error" in auth) {
    return <p className="text-sm text-base-content/70">{auth.error}</p>;
  }

  const tab = parseTab(tabParam);

  return (
    <div className="space-y-6 max-md:space-y-4">
      {tab ? <ScrollToSettingsPanel tab={tab} /> : null}
      <Suspense fallback={<PanelSkeleton />}>
        <LlmPanelServer />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <TelegramPanelServer />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <WidgetPanelServer />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <AccountPanelServer />
      </Suspense>
    </div>
  );
}
