"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ParseOptions, ParsedList, SeparatorChoice } from "@/lib/jargon/import/parse/types";

const CHOICES: { id: SeparatorChoice; label: string }[] = [
  { id: "tab", label: "Tab" },
  { id: "dash", label: "–" },
  { id: "colon", label: ":" },
  { id: "equals", label: "=" },
  { id: "comma", label: "," },
  { id: "custom", label: "Other…" },
];

type SeparatorChipsProps = {
  parsed: ParsedList;
  options: ParseOptions;
  swap: boolean;
  onOptionsChange: (patch: Partial<ParseOptions>) => void;
  onSwap: () => void;
};

export function SeparatorChips({
  parsed,
  options,
  swap,
  onOptionsChange,
  onSwap,
}: SeparatorChipsProps) {
  const [otherOpen, setOtherOpen] = useState(options.separator === "custom");
  const selected = options.separator ?? parsed.separator;
  const showSeparators = parsed.format === "lines" || parsed.format === "tsv";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSeparators ? (
          <>
            <span className="text-sm font-medium">Split at</span>
            <ToggleGroup
              aria-label="Split at"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={selected ? [selected] : []}
              onSelectionChange={(keys) => {
                const [key] = [...keys];
                if (!key) return;
                const choice = String(key) as SeparatorChoice;
                setOtherOpen(choice === "custom");
                if (choice !== "custom") onOptionsChange({ separator: choice });
              }}
            >
              {CHOICES.map((choice) => (
                <ToggleGroupItem key={choice.id} id={choice.id}>
                  {choice.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        ) : null}
        <Button
          type="button"
          variant={swap ? "default" : "outline"}
          size="sm"
          aria-pressed={swap}
          className="min-h-11 gap-1.5 md:min-h-8"
          onPress={onSwap}
        >
          <ArrowLeftRight className="size-4" aria-hidden strokeWidth={1.5} />
          Swap term and definition
        </Button>
      </div>

      {otherOpen && showSeparators ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="custom-separator">Split at this text</FieldLabel>
            <Input
              id="custom-separator"
              className="text-base"
              placeholder="e.g. ::"
              defaultValue={options.customSeparator ?? ""}
              onChange={(event) =>
                onOptionsChange({ separator: "custom", customSeparator: event.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="card-separator">Between cards (optional)</FieldLabel>
            <Input
              id="card-separator"
              className="text-base"
              placeholder="e.g. ##"
              defaultValue={options.cardSeparator ?? ""}
              onChange={(event) => onOptionsChange({ cardSeparator: event.target.value })}
            />
          </Field>
        </div>
      ) : null}

      {parsed.headingDetected || options.heading ? (
        <ToggleGroup
          aria-label="First line"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[(options.heading ?? parsed.headingDetected) ? "heading" : "term"]}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key) onOptionsChange({ heading: key === "heading" });
          }}
        >
          <ToggleGroupItem id="heading">First line is a heading</ToggleGroupItem>
          <ToggleGroupItem id="term">First line is a term</ToggleGroupItem>
        </ToggleGroup>
      ) : null}
    </div>
  );
}
