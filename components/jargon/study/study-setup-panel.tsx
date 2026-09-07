import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { CollectionSelect } from "@/components/jargon/collection-select";
import {
  QuizCenteredState,
  QuizPanelBody,
  QuizSetupFooter,
} from "@/components/jargon/quiz/quiz-ui";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { allCollectionsTermCount } from "@/lib/study/count";
import { MAX_STUDY_TERMS, type StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

export function StudySetupPanel({
  children,
  footer,
  footerHint,
}: {
  children: ReactNode;
  footer: ReactNode;
  footerHint?: ReactNode;
}) {
  return (
    <>
      <QuizPanelBody className="min-h-0 flex-1 overflow-y-auto">{children}</QuizPanelBody>
      <QuizSetupFooter
        className="sticky bottom-0 shrink-0 bg-base-100 px-5 py-4 sm:px-6"
        hint={footerHint}
      >
        {footer}
      </QuizSetupFooter>
    </>
  );
}

export function StudyResumeBanner({
  message,
  onResume,
  onDiscard,
}: {
  message: ReactNode;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <Alert>
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button type="button" size="sm" onPress={onResume} className="max-md:min-h-11">
          Resume
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onPress={onDiscard}
          className="max-md:min-h-11"
        >
          Start new
        </Button>
      </AlertAction>
    </Alert>
  );
}

export function StudyNoActiveCollectionsState({ description }: { description: string }) {
  return (
    <QuizPanelBody>
      <QuizCenteredState icon={AlertCircle} title="No active collections" description={description}>
        <LinkButton href="/jargon" variant="outline" className="min-h-11">
          Collections
        </LinkButton>
      </QuizCenteredState>
    </QuizPanelBody>
  );
}

export function StudyCollectionField({
  id,
  collections,
  value,
  onChange,
}: {
  id: string;
  collections: StudyCollection[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Collection</FieldLabel>
      <CollectionSelect
        mode="local"
        id={id}
        triggerClassName="text-sm"
        size="sm"
        collections={collections}
        value={value}
        leadingOption={{
          id: "all",
          label: `All active collections (${allCollectionsTermCount(collections)})`,
        }}
        onChange={onChange}
      />
    </Field>
  );
}

export function StudyCountField({
  id,
  label,
  presets,
  selectedValue,
  inputValue,
  error,
  max,
  availableCount,
  perUnitLabel,
  onPresetSelect,
  onInputChange,
}: {
  id: string;
  label: string;
  presets: number[];
  selectedValue: number;
  inputValue: string;
  error: string | null;
  max: number;
  availableCount: number;
  perUnitLabel: string;
  onPresetSelect: (value: number) => void;
  onInputChange: (raw: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex w-full items-stretch gap-2">
        {presets.map((preset) => {
          const selected = selectedValue === preset && error === null;
          return (
            <Button
              key={preset}
              type="button"
              variant="outline"
              onPress={() => onPresetSelect(preset)}
              isDisabled={availableCount === 0}
              aria-pressed={selected}
              className={cn(
                "min-h-11 tabular-nums",
                selected && "border-primary bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              {preset}
            </Button>
          );
        })}
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          disabled={availableCount === 0}
          className="min-h-11 min-w-16 flex-1 tabular-nums"
        />
      </div>
      <FieldDescription>
        {error ? (
          <span className="text-error">{error}</span>
        ) : (
          <>
            Choose 1–{max || 1}
            {availableCount > MAX_STUDY_TERMS
              ? ` (${MAX_STUDY_TERMS} max per ${perUnitLabel}).`
              : "."}
          </>
        )}
      </FieldDescription>
    </Field>
  );
}
