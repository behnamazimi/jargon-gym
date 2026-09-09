import { useEffect, useState, useTransition } from "react";
import {
  generateWidgetTokenAction,
  revokeWidgetTokenAction,
} from "@/app/(private)/jargon/settings/actions";
import type { WidgetTokenRow } from "@/lib/widget/types";

function shellQuote(value: string) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

export type SetupMode = "install" | "update";

export function useWidgetPanel(initialTokens: WidgetTokenRow[]) {
  const [tokens, setTokens] = useState(initialTokens);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isRevoking, startRevokeTransition] = useTransition();
  // Returning users (they already have a token) land on "update" by default;
  // first-timers land on "install". Either is still one click away.
  const [mode, setMode] = useState<SetupMode>(initialTokens.length > 0 ? "update" : "install");

  // Falls back to the production origin on the server and on first client
  // render so SSR and hydration match, then fills in the real origin once
  // mounted.
  const [origin, setOrigin] = useState("https://jargon-gym.vercel.app");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const installScriptUrl = `${origin}/install-widget.sh`;
  const installWithTokenCommand = newToken
    ? `curl -fsSL ${installScriptUrl} | JARGON_WIDGET_TOKEN=${shellQuote(newToken)} bash`
    : null;
  // No token needed — install-widget.sh keeps whatever token is already in
  // config.json, so this just refreshes the widget files in place.
  const updateCommand = `curl -fsSL ${installScriptUrl} | bash`;

  function handleGenerate() {
    setError(null);

    startGenerateTransition(async () => {
      const result = await generateWidgetTokenAction();

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
    });
  }

  function handleRevoke(tokenId: string) {
    setError(null);
    setBusyId(tokenId);

    startRevokeTransition(async () => {
      const result = await revokeWidgetTokenAction(tokenId);
      setBusyId(null);

      if (result.error) {
        setError(result.error);
        return;
      }

      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    });
  }

  return {
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
  };
}
