"use client";

import { useState, useTransition } from "react";
import { createDefinitionsRequest } from "@/app/(private)/jargon/import/request/actions";
import { RequestSent } from "@/components/requests/request-sent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { REQUEST_COPY } from "@/lib/requests/copy";

const FORM = REQUEST_COPY.form;
const DEFS = REQUEST_COPY.definitions;
const SHOWN_WORDS = 20;

export function DefinitionsForm({
  domainId,
  name,
  words,
  count,
  estimateDays,
  paused,
  used,
}: {
  domainId: string;
  name: string;
  /** The first few words, for a look at what is being asked. */
  words: string[];
  count: number;
  estimateDays: number;
  paused: boolean;
  used: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ id: string; topic: string; estimateDays: number } | null>(
    null,
  );
  const [isSending, startSending] = useTransition();

  if (sent) return <RequestSent {...sent} />;

  function send() {
    setError(null);
    startSending(async () => {
      const result = await createDefinitionsRequest({ domainId, notifyEmail: true });
      if (result.ok) setSent(result);
      else setError(result.message);
    });
  }

  return (
    <div className="space-y-5">
      <p className="m-0 text-sm text-base-content/70">{FORM.quota(used)}</p>
      {paused ? (
        <Alert>
          <AlertDescription role="status">{FORM.paused(estimateDays)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <p className="m-0">{DEFS.intro(name)}</p>
        <p className="m-0 text-sm font-medium">{DEFS.waiting(count)}</p>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {words.slice(0, SHOWN_WORDS).map((word) => (
            <li key={word} className="rounded-lg bg-base-200 px-2 py-1 text-sm">
              {word}
            </li>
          ))}
          {count > SHOWN_WORDS ? (
            <li className="px-1 py-1 text-sm text-base-content/60">+{count - SHOWN_WORDS}</li>
          ) : null}
        </ul>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2 pb-4">
        <Button type="button" className="min-h-12 w-full" isDisabled={isSending} onPress={send}>
          {isSending ? FORM.sending : FORM.submit}
        </Button>
        <p className="m-0 text-center text-sm text-base-content/60">{FORM.eta(estimateDays)}</p>
      </div>
    </div>
  );
}
