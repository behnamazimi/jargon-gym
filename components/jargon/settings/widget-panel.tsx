"use client";

import { Monitor, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  generateWidgetTokenAction,
  revokeWidgetTokenAction,
} from "@/app/(private)/jargon/settings/actions";
import {
  AlertBanner,
  CopyField,
  HighlightPanel,
  SettingsPanel,
  SetupStep,
  TokenRow,
} from "@/components/jargon/settings/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn, formatDateTime } from "@/lib/utils";
import type { WidgetTokenRow } from "@/lib/widget/types";

type WidgetPanelProps = {
  initialTokens: WidgetTokenRow[];
  latestWidgetVersion: string;
};

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function VersionBadge({
  widgetVersion,
  latestWidgetVersion,
}: {
  widgetVersion: string | null;
  latestWidgetVersion: string;
}) {
  if (!widgetVersion) {
    return (
      <Badge variant="outline" className="gap-1.5 text-xs font-medium">
        <span className="size-1.5 shrink-0 rounded-full bg-base-content/30" aria-hidden />
        Not reporting a version yet
      </Badge>
    );
  }

  const isUpToDate = widgetVersion === latestWidgetVersion;

  return (
    <Badge variant="outline" className="gap-1.5 text-xs font-medium">
      <span
        className={cn("size-1.5 shrink-0 rounded-full", isUpToDate ? "bg-success" : "bg-warning")}
        aria-hidden
      />
      {isUpToDate
        ? `Up to date (v${widgetVersion})`
        : `Update available (v${widgetVersion} → v${latestWidgetVersion})`}
    </Badge>
  );
}

type SetupMode = "install" | "update";

export function WidgetPanel({ initialTokens, latestWidgetVersion }: WidgetPanelProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Returning users (they already have a token) land on "update" by default;
  // first-timers land on "install". Either is still one click away.
  const [mode, setMode] = useState<SetupMode>(initialTokens.length > 0 ? "update" : "install");

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://jargon-gym.vercel.app";
  const installScriptUrl = `${origin}/install-widget.sh`;
  const installWithTokenCommand = newToken
    ? `curl -fsSL ${installScriptUrl} | JARGON_WIDGET_TOKEN=${shellQuote(newToken)} bash`
    : null;
  // No token needed — install-widget.sh keeps whatever token is already in
  // config.json, so this just refreshes the widget files in place.
  const updateCommand = `curl -fsSL ${installScriptUrl} | bash`;

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);

    const result = await generateWidgetTokenAction();
    setIsGenerating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.token && result.id) {
      setNewToken(result.token);
      setTokens((prev) => [
        {
          id: result.id!,
          label: "Übersicht widget",
          created_at: new Date().toISOString(),
          last_used_at: null,
          widget_version: null,
        },
        ...prev,
      ]);
    }
  }

  async function handleRevoke(tokenId: string) {
    setError(null);
    setBusyId(tokenId);

    const result = await revokeWidgetTokenAction(tokenId);
    setBusyId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setTokens((prev) => prev.filter((t) => t.id !== tokenId));
  }

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
        <ol className="m-0 list-none space-y-0 p-0">
          <SetupStep
            step={1}
            title="Install Übersicht"
            description="The widget runs on Übersicht, a macOS app for desktop widgets. Install it first."
          >
            <p className="m-0 text-sm text-base-content/60">
              Get it from the{" "}
              <a
                href="https://tracesof.net/uebersicht/"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-hover"
              >
                official site
              </a>{" "}
              or install it with Homebrew via its{" "}
              <a
                href="https://formulae.brew.sh/cask/ubersicht"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-hover"
              >
                cask page
              </a>
              .
            </p>
          </SetupStep>

          <SetupStep
            step={2}
            title="Create an API token"
            description="You'll only see this token once — copy it straight into step 3."
          >
            <Button
              type="button"
              onPress={handleGenerate}
              isDisabled={isGenerating}
              className="min-h-11 w-full md:w-auto"
            >
              {isGenerating ? "Generating…" : "Generate widget token"}
            </Button>

            {newToken ? (
              <HighlightPanel label="Copy your new token now">
                <CopyField value={newToken} />
              </HighlightPanel>
            ) : null}
          </SetupStep>

          <SetupStep
            step={3}
            title="Install the widget"
            description="This command downloads the widget and fills in this site's URL and your token. Refresh Übersicht afterward."
            isLast
          >
            {installWithTokenCommand ? (
              <CopyField
                label="Install with token"
                hint="Run this after you generate a token in step 2."
                value={installWithTokenCommand}
              />
            ) : (
              <p className="m-0 text-sm text-base-content/60">
                Generate a token in step 2 to get the one-command install script.
              </p>
            )}
            <p className="m-0 text-sm leading-relaxed text-base-content/60">
              Or{" "}
              <a href="/downloads/jargon-gym.widget.zip" download className="link link-hover">
                download the zip
              </a>{" "}
              and unzip into{" "}
              <code className="rounded-md bg-base-200 px-1.5 py-0.5 text-xs break-all">
                ~/Library/Application Support/Übersicht/widgets/
              </code>
              .
            </p>
          </SetupStep>
        </ol>
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
        <div className="space-y-2 border-t border-base-300/60 pt-5">
          <h3 className="m-0 text-sm font-semibold">Active tokens</h3>
          <ul className="m-0 divide-y divide-base-300/60 p-0">
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                label={token.label}
                meta={`Created ${formatDateTime(token.created_at, "Never")} · Last used ${formatDateTime(token.last_used_at, "Never")}`}
                badge={
                  <VersionBadge
                    widgetVersion={token.widget_version}
                    latestWidgetVersion={latestWidgetVersion}
                  />
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onPress={() => handleRevoke(token.id)}
                    isDisabled={busyId === token.id}
                    className="min-h-11 w-full text-error hover:bg-error/10 md:w-auto"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.5} />
                    Revoke
                  </Button>
                }
              />
            ))}
          </ul>
        </div>
      ) : null}
    </SettingsPanel>
  );
}
