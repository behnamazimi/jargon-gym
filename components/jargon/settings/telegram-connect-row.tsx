import { ExternalLink } from "lucide-react";
import { CopyField, SettingsRow } from "@/components/jargon/settings/ui";
import { Button, LinkButton } from "@/components/ui/button";

type TelegramConnectRowProps = {
  isGenerating: boolean;
  onGenerateLink: () => void;
  deepLink: string | null;
};

export function TelegramConnectRow({
  isGenerating,
  onGenerateLink,
  deepLink,
}: TelegramConnectRowProps) {
  return (
    <SettingsRow
      title="Connect"
      description="Generate a link, open it in Telegram, and tap Start. Don't share the link — it expires in 5 minutes."
    >
      <Button
        type="button"
        onPress={onGenerateLink}
        isDisabled={isGenerating}
        className="min-h-11 w-full md:w-auto"
      >
        {isGenerating ? "Generating…" : "Generate Telegram link"}
      </Button>

      {deepLink ? (
        <div className="space-y-3">
          <CopyField value={deepLink} />
          <LinkButton
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            variant="outline"
            className="min-h-11 w-full md:w-auto"
          >
            Open bot
            <ExternalLink className="size-3.5" strokeWidth={1.5} />
          </LinkButton>
        </div>
      ) : null}
    </SettingsRow>
  );
}
