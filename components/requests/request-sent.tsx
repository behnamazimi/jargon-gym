"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { setRequestNotify } from "@/app/(private)/jargon/actions-requests";
import { LinkButton } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { REQUEST_COPY } from "@/lib/requests/copy";

const SENT = REQUEST_COPY.sent;

export function RequestSent({
  id,
  topic,
  estimateDays,
}: {
  id: string;
  topic: string;
  estimateDays: number;
}) {
  const { toast } = useToast();
  const [notify, setNotify] = useState(true);

  async function changeNotify(next: boolean) {
    setNotify(next);
    const result = await setRequestNotify(id, next);
    if (!result.ok) {
      setNotify(!next);
      toast(result.message, "destructive");
    }
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-success/15 text-success">
        <Check className="size-6" aria-hidden strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h2 tabIndex={-1} className="m-0 text-xl font-semibold outline-none">
          {SENT.title}
        </h2>
        <p className="m-0 text-base-content/80" role="status">
          {SENT.body(topic, estimateDays)}
        </p>
      </div>

      <div className="shadow-surface space-y-3 rounded-2xl bg-base-100 p-4">
        <h3 className="m-0 text-sm font-semibold">{SENT.howTitle}</h3>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="block font-medium">{SENT.email}</span>
            <span className="block text-sm text-base-content/60">{SENT.emailHint}</span>
          </span>
          <Switch
            aria-label={SENT.email}
            checked={notify}
            onCheckedChange={(next) => void changeNotify(next)}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 pb-4">
        <LinkButton href="/jargon" className="min-h-12 w-full">
          {SENT.done}
        </LinkButton>
        <LinkButton href="/jargon/browse" variant="ghost" className="min-h-11 w-full">
          {SENT.browse}
        </LinkButton>
      </div>
    </div>
  );
}
