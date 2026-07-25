"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  generateWidgetTokenAction,
  revokeWidgetTokenAction,
} from "@/app/(private)/jargon/settings/actions";
import { AlertBanner, CopyField, HighlightPanel, SetupStep } from "@/components/jargon/settings/ui";
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
          <p className="text-[13px] text-muted">
            Get{" "}
            <a
              href="https://tracesof.net/uebersicht/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Übersicht
            </a>{" "}
            first, or{" "}
            <a
              href="/downloads/jargon-gym.widget.zip"
              download
              className="text-accent hover:underline"
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
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {isGenerating ? "Generating…" : "Generate widget token"}
          </button>

          {newToken ? (
            <HighlightPanel label="Copy your new token now">
              <CopyField value={newToken} />
            </HighlightPanel>
          ) : null}

          {tokens.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-medium">{token.label}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      Created {formatDate(token.created_at)} · Last used{" "}
                      {formatDate(token.last_used_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(token.id)}
                    disabled={busyId === token.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-muted">No active tokens yet.</p>
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
            <p className="text-[13px] text-muted">
              Generate a token in step 2 to get the one-command install script.
            </p>
          )}
        </SetupStep>
      </ol>
    </div>
  );
}
