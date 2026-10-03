import { History } from "lucide-react";
import type { ReactNode } from "react";
import { CollectionSelect } from "@/components/library/collection-select";
import { QuizPanelBody, QuizSetupFooter } from "@/components/quiz/quiz-ui";
import { Button } from "@/components/ui/button";
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
    <QuizPanelBody className="min-h-0 flex-1 overflow-y-auto">
      {children}
      <QuizSetupFooter hint={footerHint}>{footer}</QuizSetupFooter>
    </QuizPanelBody>
  );
}

export function StudyResumeBanner({
  message,
  onResume,
}: {
  message: ReactNode;
  onResume: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-field border border-primary/30 bg-primary/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="inline-flex shrink-0 size-8 items-center justify-center rounded-full bg-primary/15 text-primary-text">
          <History className="size-4" aria-hidden strokeWidth={2} />
        </span>
        <p className="m-0 text-sm text-base-content">{message}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Button type="button" size="sm" onPress={onResume}>
          Resume
        </Button>
      </div>
    </div>
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
                selected && "border-primary bg-primary/10 text-primary-text hover:bg-primary/15",
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
          placeholder="Custom"
          className="min-h-11 w-24 flex-none border-dashed tabular-nums"
        />
      </div>
      {error ? (
        <FieldDescription>
          <span className="text-error-text">{error}</span>
        </FieldDescription>
      ) : availableCount > MAX_STUDY_TERMS ? (
        <FieldDescription>
          Up to {MAX_STUDY_TERMS} per {perUnitLabel}.
        </FieldDescription>
      ) : null}
    </Field>
  );
}
