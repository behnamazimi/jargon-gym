"use client";

import { Check, Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  generateWidgetTokenAction,
  revokeWidgetTokenAction,
} from "@/app/(private)/jargon/settings/actions";
import type { WidgetTokenRow } from "@/lib/widget/types";

type WidgetSettingsProps = {
  initialTokens: WidgetTokenRow[];
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export function WidgetSettings({ initialTokens }: WidgetSettingsProps) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);
  const [installWithTokenCopied, setInstallWithTokenCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const installScriptUrl = `${origin}/install-widget.sh`;

  const installCommand = `curl -fsSL ${installScriptUrl} | JARGON_BASE_URL=${shellQuote(origin)} bash`;

  const installWithTokenCommand = newToken
    ? `curl -fsSL ${installScriptUrl} | JARGON_BASE_URL=${shellQuote(origin)} JARGON_WIDGET_TOKEN=${shellQuote(newToken)} bash`
    : null;

  async function handleGenerate() {
    setError(null);
    setCopied(false);
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

  async function handleCopyInstallWithToken() {
    if (!installWithTokenCommand) return;
    await navigator.clipboard.writeText(installWithTokenCommand);
    setInstallWithTokenCopied(true);
    setTimeout(() => setInstallWithTokenCopied(false), 2000);
  }

  async function handleCopyInstall() {
    await navigator.clipboard.writeText(installCommand);
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 2000);
  }

  async function handleCopy() {
    if (!newToken) return;
    await navigator.clipboard.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-7">
      <div className="mb-6">
        <Link
          href="/jargon"
          className="text-sm text-muted no-underline hover:text-foreground hover:underline"
        >
          ← Back to jargon
        </Link>
        <h1 className="mt-3 text-[22px] font-bold tracking-tight">Widget settings</h1>
        <p className="mt-1 text-sm text-muted">
          Connect the Übersicht desktop widget to your live jargon collection.
        </p>
      </div>

      <section className="mb-8 rounded-card border border-border bg-surface p-5 shadow-sm">
        <h2 className="m-0 text-[15px] font-semibold">API tokens</h2>
        <p className="mt-1 text-[13px] text-muted">
          Generate a token for the widget. It is shown once — use it with the install commands
          below, or paste it into <code className="text-[12px]">config.json</code>.
        </p>

        {error ? <p className="mt-3 text-[13px] text-red-600">{error}</p> : null}

        {newToken ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-accent/30 bg-accent-subtle px-3 py-3">
              <p className="m-0 text-[12px] font-medium uppercase tracking-wide text-accent">
                New token — copy now
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-[12px] text-foreground">
                  {newToken}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium hover:bg-black/5"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {installWithTokenCommand ? (
              <div>
                <p className="m-0 text-[12px] font-medium text-foreground">Install with token</p>
                <p className="mt-1 text-[12px] text-muted">
                  Downloads, installs, and writes the token into config.json automatically.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2 text-[12px]">
                    {installWithTokenCommand}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyInstallWithToken}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium hover:bg-black/5"
                  >
                    {installWithTokenCopied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {installWithTokenCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="mt-4 rounded-lg bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Generate widget token"}
        </button>

        {tokens.length > 0 ? (
          <ul className="mt-5 divide-y divide-border border-t border-border">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 py-3">
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
          <p className="mt-4 text-[13px] text-muted">No tokens yet.</p>
        )}
      </section>

      <section className="mb-8 rounded-card border border-border bg-surface p-5 shadow-sm">
        <h2 className="m-0 text-[15px] font-semibold">Install widget</h2>
        <p className="mt-1 text-[13px] text-muted">
          Requires{" "}
          <a
            href="https://tracesof.net/uebersicht/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Übersicht
          </a>
          . This downloads the widget, installs it, and pre-fills{" "}
          <code className="text-[12px]">config.json</code> with this site&apos;s URL.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-background px-3 py-2 text-[12px]">
            {installCommand}
          </code>
          <button
            type="button"
            onClick={handleCopyInstall}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium hover:bg-black/5"
          >
            {installCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {installCopied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Or{" "}
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
      </section>

      <section className="rounded-card border border-border bg-surface p-5 shadow-sm">
        <h2 className="m-0 text-[15px] font-semibold">After installing</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-muted">
          <li>Generate a widget token above.</li>
          <li>
            Run <strong className="font-medium text-foreground">Install with token</strong>{" "}
            (reinstalls the widget and writes the token automatically).
          </li>
          <li>Refresh Übersicht (or restart it).</li>
        </ol>
      </section>
    </div>
  );
}
