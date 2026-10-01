"use client";

import { ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { createRequest } from "@/app/(private)/jargon/import/request/actions";
import { SearchResults } from "@/components/jargon/import/chooser-search-results";
import { RequestSent } from "@/components/requests/request-sent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LanguageToggle } from "@/components/jargon/language-toggle";
import { useBrowseSearch } from "@/hooks/use-browse-search";
import type { DomainLanguage } from "@/lib/jargon/languages";
import { REQUEST_COPY } from "@/lib/requests/copy";
import { MAX_TOPIC_LENGTH } from "@/lib/requests/schema";
import {
  REQUEST_KINDS,
  REQUEST_LEVELS,
  REQUEST_SIZES,
  type RequestKind,
  type RequestLevel,
} from "@/lib/requests/types";

const FORM = REQUEST_COPY.form;

export type RecentRequest = {
  key: string;
  topic: string;
  createdDate: string;
  sentence: string;
  collectionId: string | null;
};

type RequestFormProps = {
  initialTopic: string;
  estimateDays: number;
  paused: boolean;
  used: number;
  recent: RecentRequest[];
  ownedNames: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

function Choice<T extends string | number>({
  label,
  options,
  value,
  onChange,
  render,
  isDisabled,
}: {
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  render: (option: T) => string;
  isDisabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        aria-label={label}
        selectionMode="single"
        variant="outline"
        isDisabled={isDisabled}
        selectedKeys={value === null ? [] : [String(value)]}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          onChange(options.find((option) => String(option) === key) ?? null);
        }}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={String(option)} id={String(option)} className="min-h-11">
            {render(option)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

export function RequestForm({
  initialTopic,
  estimateDays,
  paused,
  used,
  recent,
  ownedNames,
}: RequestFormProps) {
  const browse = useBrowseSearch(initialTopic);
  const topic = browse.query;
  const [kind, setKind] = useState<RequestKind>("jargon");
  const [language, setLanguage] = useState<DomainLanguage>("en");
  const [level, setLevel] = useState<string | null>(null);
  const [size, setSize] = useState<number | null>(null);
  const [known, setKnown] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ id: string; topic: string; estimateDays: number } | null>(
    null,
  );
  const [isSending, startSending] = useTransition();

  if (sent) return <RequestSent {...sent} />;

  const key = normalize(topic);
  const repeat = key ? recent.find((request) => request.key === key) : undefined;
  const owned = key ? ownedNames.find((name) => normalize(name) === key) : undefined;
  const canSend = topic.trim().length >= 3 && !isSending;

  function send() {
    setError(null);
    startSending(async () => {
      const result = await createRequest({
        topic,
        kind,
        language,
        level: level ?? undefined,
        size: size ?? undefined,
        knownTerms: known,
        notifyEmail: true,
      });
      if (result.ok) setSent(result);
      else setError(result.message);
    });
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) send();
      }}
    >
      <p className="text-sm text-base-content/70">{FORM.quota(used)}</p>
      {paused ? (
        <Alert>
          <AlertDescription role="status">{FORM.paused(estimateDays)}</AlertDescription>
        </Alert>
      ) : null}

      <Field>
        <FieldLabel htmlFor="request-topic">{FORM.topicLabel}</FieldLabel>
        <Input
          id="request-topic"
          value={topic}
          maxLength={MAX_TOPIC_LENGTH + 20}
          disabled={isSending}
          className="min-h-12 text-base"
          placeholder={FORM.topicPlaceholder}
          onChange={(event) => browse.handleQuery(event.target.value)}
        />
      </Field>

      {repeat ? (
        <Alert>
          <AlertDescription role="status">
            {FORM.repeatTopic(repeat.topic, repeat.createdDate, repeat.sentence)}{" "}
            {repeat.collectionId ? (
              <LinkButton
                href={`/jargon?domain=${repeat.collectionId}`}
                variant="outline"
                size="sm"
                className="min-h-11 md:min-h-8"
              >
                {FORM.openIt}
              </LinkButton>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      {owned ? (
        <p className="m-0 text-sm text-base-content/60" role="status">
          {FORM.existingName(owned)}
        </p>
      ) : null}

      {browse.search.status === "done" && browse.search.domains.length > 0 ? (
        <p className="m-0 text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          {FORM.closeMatches}
        </p>
      ) : null}
      <SearchResults
        state={browse.search}
        addingId={browse.addingId}
        addedIds={browse.addedIds}
        onAdd={(id) => void browse.add(id)}
        hideWhenEmpty
      />

      <Choice
        label={FORM.kindLabel}
        options={REQUEST_KINDS}
        value={kind}
        isDisabled={isSending}
        render={(option) => FORM.kinds[option]}
        onChange={(next) => {
          if (!next) return;
          setKind(next);
          setLevel(null);
        }}
      />

      <Field>
        <FieldLabel>{FORM.languageLabel}</FieldLabel>
        <LanguageToggle value={language} onChange={setLanguage} isDisabled={isSending} />
      </Field>

      <Collapsible isExpanded={detailsOpen} onExpandedChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {FORM.detailsToggle}
          <ChevronDown
            className={`size-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
            aria-hidden
            strokeWidth={1.5}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-5 pt-2">
            <Choice
              label={FORM.levelLabel}
              options={REQUEST_LEVELS[kind] as readonly string[]}
              value={level}
              isDisabled={isSending}
              render={(option) => FORM.levels[option as RequestLevel]}
              onChange={setLevel}
            />
            <Choice
              label={FORM.sizeLabel}
              options={REQUEST_SIZES}
              value={size}
              isDisabled={isSending}
              render={FORM.size}
              onChange={setSize}
            />
            <Field>
              <FieldLabel htmlFor="request-known">{FORM.knownLabel}</FieldLabel>
              <Textarea
                id="request-known"
                value={known}
                rows={4}
                disabled={isSending}
                className="min-h-24 text-base"
                onChange={(event) => setKnown(event.target.value)}
              />
              <p className="m-0 text-sm text-base-content/60">{FORM.knownHelp}</p>
            </Field>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <p className="text-sm text-base-content/60">{FORM.privacy}</p>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2 pb-4">
        <Button type="submit" className="min-h-12 w-full" isDisabled={!canSend}>
          {isSending ? FORM.sending : FORM.submit}
        </Button>
        <p className="m-0 text-center text-sm text-base-content/60">{FORM.eta(estimateDays)}</p>
      </div>
    </form>
  );
}
