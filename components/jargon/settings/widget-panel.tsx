"use client";

import { Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
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

  const hasTokens = tokens.length > 0;

  return (
    <SettingsPanel
      id="widget"
      title="Desktop Widget Setup"
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
              className="text-primary hover:underline"
            >
              official site
            </a>{" "}
            or install it with Homebrew via its{" "}
            <a
              href="https://formulae.brew.sh/cask/ubersicht"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              cask page
            </a>
            .
          </p>
        </SetupStep>

        <SetupStep
          step={2}
          title="Create an API token"
          description="You'll only see each token once. Revoke any you're not using."
        >
          <Button
            type="button"
            onPress={handleGenerate}
            isDisabled={isGenerating}
            className="text-sm"
          >
            {isGenerating ? "Generating…" : "Generate widget token"}
          </Button>

          {newToken ? (
            <HighlightPanel label="Copy your new token now">
              <CopyField value={newToken} />
            </HighlightPanel>
          ) : null}

          {hasTokens ? (
            <ul className="m-0 list-none space-y-2 p-0">
              {tokens.map((token) => (
                <li key={token.id}>
                  <TokenRow
                    label={token.label}
                    meta={`Created ${formatDate(token.created_at)} · Last used ${formatDate(token.last_used_at)}`}
                    action={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onPress={() => handleRevoke(token.id)}
                        isDisabled={busyId === token.id}
                        className="shrink-0 text-error hover:bg-error/10"
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.5} />
                        Revoke
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-base-content/60">
              Generate a token to unlock the one-command install in step 3.
            </p>
          )}
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
          <p className="m-0 text-sm text-base-content/60">
            Or{" "}
            <a
              href="/downloads/jargon-gym.widget.zip"
              download
              className="text-primary hover:underline"
            >
              download the zip
            </a>{" "}
            and unzip into{" "}
            <code className="rounded-md bg-base-200 px-1.5 py-0.5 text-xs">
              ~/Library/Application Support/Übersicht/widgets/
            </code>
            .
          </p>
        </SetupStep>
      </ol>
    </SettingsPanel>
  );
}
