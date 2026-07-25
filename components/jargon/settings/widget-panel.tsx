"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  generateWidgetTokenAction,
  revokeWidgetTokenAction,
} from "@/app/(private)/jargon/settings/actions";
import { AlertBanner, CopyField, HighlightPanel, SetupStep } from "@/components/jargon/settings/ui";
import { Button } from "@/components/ui/button";
import type { WidgetTokenRow } from "@/lib/widget/types";

type WidgetPanelProps = {
  initialTokens: WidgetTokenRow[];
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function WidgetPanel({ initialTokens }: WidgetPanelProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const installScriptUrl = `${origin}/install-widget.sh`;
  const installCommand = `curl -fsSL ${installScriptUrl} | JARGON_BASE_URL=${shellQuote(origin)} bash`;
  const installWithTokenCommand = newToken
    ? `curl -fsSL ${installScriptUrl} | JARGON_BASE_URL=${shellQuote(origin)} JARGON_WIDGET_TOKEN=${shellQuote(newToken)} bash`
    : null;

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

  return (
    <div className="space-y-6">
      {error ? <AlertBanner message={error} /> : null}

      <ol className="m-0 list-none space-y-8 p-0">
        <SetupStep
          step={1}
          title="Install the widget"
          description="Requires Übersicht on macOS. This command downloads the widget and pre-fills this site's URL in config.json."
        >
          <CopyField value={installCommand} />
          <p className="text-[13px] text-muted-foreground">
            Get{" "}
            <a
              href="https://tracesof.net/uebersicht/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Übersicht
            </a>{" "}
            first, or{" "}
            <a
              href="/downloads/jargon-gym.widget.zip"
              download
              className="text-primary hover:underline"
            >
              download the zip
            </a>{" "}
            and unzip into{" "}
            <code className="text-[12px]">~/Library/Application Support/Übersicht/widgets/</code>.
          </p>
        </SetupStep>

        <SetupStep
          step={2}
          title="Create an API token"
          description="Tokens are shown once. Revoke any token you no longer use."
        >
          <Button
            type="button"
            onPress={handleGenerate}
            isDisabled={isGenerating}
            className="text-[13px]"
          >
            {isGenerating ? "Generating…" : "Generate widget token"}
          </Button>

          {newToken ? (
            <HighlightPanel label="Copy your new token now">
              <CopyField value={newToken} />
            </HighlightPanel>
          ) : null}

          {tokens.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg ring-1 ring-foreground/10">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium">{token.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Created {formatDate(token.created_at)} · Last used{" "}
                      {formatDate(token.last_used_at)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleRevoke(token.id)}
                    isDisabled={busyId === token.id}
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active tokens yet.</p>
          )}
        </SetupStep>

        <SetupStep
          step={3}
          title="Finish setup"
          description="Reinstall with your token so config.json is updated automatically, then refresh Übersicht."
        >
          {installWithTokenCommand ? (
            <CopyField
              label="Install with token"
              hint="Run this after generating a token in step 2."
              value={installWithTokenCommand}
            />
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Generate a token in step 2 to get the one-command install script.
            </p>
          )}
        </SetupStep>
      </ol>
    </div>
  );
}
