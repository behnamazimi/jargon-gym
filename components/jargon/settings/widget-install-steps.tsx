import { CopyField, HighlightPanel, SetupStep } from "@/components/jargon/settings/ui";
import { Button } from "@/components/ui/button";

type WidgetInstallStepsProps = {
  isGenerating: boolean;
  onGenerate: () => void;
  newToken: string | null;
  installWithTokenCommand: string | null;
};

export function WidgetInstallSteps({
  isGenerating,
  onGenerate,
  newToken,
  installWithTokenCommand,
}: WidgetInstallStepsProps) {
  return (
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
          onPress={onGenerate}
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
  );
}
