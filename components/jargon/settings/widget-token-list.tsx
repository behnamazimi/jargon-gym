import { Trash2 } from "lucide-react";
import { TokenRow } from "@/components/jargon/settings/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";
import type { WidgetTokenRow } from "@/lib/widget/types";

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

type WidgetTokenListProps = {
  tokens: WidgetTokenRow[];
  latestWidgetVersion: string;
  isRevoking: boolean;
  busyId: string | null;
  onRevoke: (tokenId: string) => void;
};

export function WidgetTokenList({
  tokens,
  latestWidgetVersion,
  isRevoking,
  busyId,
  onRevoke,
}: WidgetTokenListProps) {
  return (
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
                onPress={() => onRevoke(token.id)}
                isDisabled={isRevoking && busyId === token.id}
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
  );
}
