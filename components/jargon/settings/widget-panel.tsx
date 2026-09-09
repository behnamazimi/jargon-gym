"use client";

import { Monitor } from "lucide-react";
import { AlertBanner, CopyField, SettingsPanel } from "@/components/jargon/settings/ui";
import { WidgetInstallSteps } from "@/components/jargon/settings/widget-install-steps";
import { WidgetTokenList } from "@/components/jargon/settings/widget-token-list";
import { useWidgetPanel } from "@/components/jargon/settings/use-widget-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { WidgetTokenRow } from "@/lib/widget/types";

type WidgetPanelProps = {
  initialTokens: WidgetTokenRow[];
  latestWidgetVersion: string;
};

export function WidgetPanel({ initialTokens, latestWidgetVersion }: WidgetPanelProps) {
  const {
    tokens,
    newToken,
    error,
    busyId,
    isGenerating,
    isRevoking,
    mode,
    setMode,
    installWithTokenCommand,
    updateCommand,
    handleGenerate,
    handleRevoke,
  } = useWidgetPanel(initialTokens);

  const hasTokens = tokens.length > 0;

  return (
    <SettingsPanel
      id="widget"
      icon={Monitor}
      title="Desktop widget"
      description="Show live terms on your Mac with the Übersicht widget."
      status={
        <Badge variant="outline" className="gap-1.5 text-xs font-medium">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              hasTokens ? "bg-success" : "bg-base-content/30",
            )}
            aria-hidden
          />
          {hasTokens
            ? `${tokens.length} active ${tokens.length === 1 ? "token" : "tokens"}`
            : "No tokens"}
        </Badge>
      }
    >
      {error ? <AlertBanner message={error} /> : null}

      <ToggleGroup
        selectionMode="single"
        selectedKeys={new Set([mode])}
        onSelectionChange={(keys) => {
          const next = keys.values().next().value;
          if (next === "install" || next === "update") setMode(next);
        }}
        variant="outline"
        aria-label="Widget setup mode"
        className="flex w-full"
      >
        <ToggleGroupItem id="install" className="min-h-11 min-w-0 flex-1">
          New install
        </ToggleGroupItem>
        <ToggleGroupItem id="update" className="min-h-11 min-w-0 flex-1">
          Update
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === "install" ? (
        <WidgetInstallSteps
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          newToken={newToken}
          installWithTokenCommand={installWithTokenCommand}
        />
      ) : hasTokens ? (
        <div className="space-y-3 rounded-xl bg-base-200/50 p-4">
          <p className="m-0 text-sm text-base-content/70">
            Already have the widget running? This refreshes it to the latest version in place — it
            keeps your existing token, so there's nothing to generate.
          </p>
          <CopyField label="Update" value={updateCommand} />
          <p className="m-0 text-sm text-base-content/60">
            Refresh Übersicht (or restart it) once it finishes.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl bg-base-200/50 p-4">
          <p className="m-0 text-sm text-base-content/70">
            You don&apos;t have a token yet, so there&apos;s nothing installed to update.
          </p>
          <Button
            type="button"
            variant="outline"
            onPress={() => setMode("install")}
            className="min-h-11 w-full md:w-auto"
          >
            Go to New install
          </Button>
        </div>
      )}

      {hasTokens ? (
        <WidgetTokenList
          tokens={tokens}
          latestWidgetVersion={latestWidgetVersion}
          isRevoking={isRevoking}
          busyId={busyId}
          onRevoke={handleRevoke}
        />
      ) : null}
    </SettingsPanel>
  );
}
