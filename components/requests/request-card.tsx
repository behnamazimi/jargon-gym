"use client";

import { useState, useTransition } from "react";
import {
  cancelRequest,
  dismissRequest,
  replyToRequest,
} from "@/app/(private)/app/actions-requests";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { REQUEST_COPY } from "@/lib/requests/copy";
import { dueLine, pillFor } from "@/lib/requests/status";
import type { MyRequest } from "@/lib/requests/types";
import { cn } from "@/lib/utils";

const CARD = REQUEST_COPY.card;

const PILL_CLASS = {
  queue: "badge-ghost",
  prep: "badge-warning badge-soft",
  question: "badge-info badge-soft",
  ready: "badge-success badge-soft",
} as const;

function ReplyBox({ request }: { request: MyRequest }) {
  const { toast } = useToast();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, startSending] = useTransition();

  function send() {
    setError(null);
    startSending(async () => {
      const result = await replyToRequest(request.id, reply);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast(CARD.replySent, "success");
    });
  }

  return (
    <div className="space-y-2">
      <p className="m-0 text-sm">{CARD.question}</p>
      {request.question ? (
        <p className="m-0 rounded-field bg-base-200 px-3 py-2 text-sm break-words whitespace-pre-line">
          {request.question}
        </p>
      ) : null}
      <label className="block text-sm font-medium" htmlFor={`reply-${request.id}`}>
        {CARD.replyLabel}
      </label>
      <Textarea
        id={`reply-${request.id}`}
        value={reply}
        rows={3}
        maxLength={1000}
        disabled={isSending}
        className="min-h-20 text-base"
        onChange={(event) => setReply(event.target.value)}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        size="sm"
        className="min-h-11 md:min-h-8"
        isDisabled={isSending || reply.trim().length === 0}
        onPress={send}
      >
        {isSending ? CARD.sendingReply : CARD.sendReply}
      </Button>
    </div>
  );
}

function deliveredLine(request: MyRequest): string {
  if (request.deliveryKind === "added_shared" && request.deliveredDomainName) {
    return CARD.addedShared(request.deliveredDomainName);
  }
  if (request.deliveryKind === "filled") return CARD.filled(request.deliveredTerms ?? 0);
  return CARD.ready(request.deliveredTerms ?? 0);
}

function Delivered({ request }: { request: MyRequest }) {
  const domainId = request.deliveredDomainId;
  return (
    <div className="space-y-3">
      <p className="m-0 text-sm" role="status">
        {deliveredLine(request)}
      </p>
      {domainId ? (
        <div className="flex flex-wrap gap-2">
          <LinkButton
            href={`/app/read?domain=${domainId}`}
            size="sm"
            className="min-h-11 md:min-h-8"
          >
            {CARD.startReading}
          </LinkButton>
          <LinkButton
            href={`/app/library?domain=${domainId}`}
            size="sm"
            variant="outline"
            className="min-h-11 md:min-h-8"
          >
            {CARD.openCollection}
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}

function Declined({ request }: { request: MyRequest }) {
  return (
    <div className="space-y-3">
      <p className="m-0 font-medium">{CARD.declinedTitle}</p>
      {request.declineReason ? (
        <p className="m-0 text-sm">{REQUEST_COPY.declineReasons[request.declineReason]}</p>
      ) : null}
      {request.declineNote ? (
        <p className="m-0 text-sm text-base-content/70">{request.declineNote}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <LinkButton
          href="/app/import/paste"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
        >
          {CARD.pasteList}
        </LinkButton>
        <LinkButton href="/app/browse" size="sm" variant="outline" className="min-h-11 md:min-h-8">
          {CARD.browse}
        </LinkButton>
      </div>
    </div>
  );
}

export function RequestCard({ request }: { request: MyRequest }) {
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [isWorking, startWorking] = useTransition();
  const status = request.displayStatus;
  const pill = pillFor(status);
  const canCancel = request.status !== "ready" && request.status !== "declined";
  const closed = status === "ready" || status === "declined";

  function cancel() {
    startWorking(async () => {
      const result = await cancelRequest(request.id);
      toast(result.ok ? CARD.cancelled : result.message, result.ok ? "success" : "destructive");
    });
  }

  function dismiss() {
    startWorking(async () => {
      const result = await dismissRequest(request.id);
      if (!result.ok) toast(result.message, "destructive");
    });
  }

  return (
    <section
      className="shadow-surface space-y-3 rounded-box bg-base-100 p-4"
      aria-label={request.topic}
    >
      <div className="flex items-start gap-3">
        <h2 className="m-0 min-w-0 flex-1 text-base font-medium break-words">{request.topic}</h2>
        {pill ? (
          <Badge variant="outline" className={cn("shrink-0", PILL_CLASS[pill.tone])}>
            {pill.label}
          </Badge>
        ) : null}
      </div>

      {status === "requested" ? (
        <p className="m-0 text-sm text-base-content/70">{dueLine(request)}</p>
      ) : null}
      {status === "in_progress" ? (
        <div className="space-y-1">
          <p className="m-0 text-sm">{CARD.preparing}</p>
          <p className="m-0 text-sm text-base-content/70">{dueLine(request)}</p>
        </div>
      ) : null}
      {status === "needs_input" ? <ReplyBox request={request} /> : null}
      {status === "ready" ? <Delivered request={request} /> : null}
      {status === "declined" ? <Declined request={request} /> : null}

      <div className="flex justify-end">
        {canCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-8"
            isDisabled={isWorking}
            onPress={() => setCancelOpen(true)}
          >
            {CARD.cancel}
          </Button>
        ) : null}
        {closed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-8"
            isDisabled={isWorking}
            onPress={dismiss}
          >
            {CARD.dismiss}
          </Button>
        ) : null}
      </div>

      <AlertDialog isOpen={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>{CARD.cancelTitle(request.topic)}</AlertDialogTitle>
          <AlertDialogDescription>
            {request.accepted ? CARD.cancelBodyStarted : CARD.cancelBody}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{CARD.keep}</AlertDialogCancel>
          <AlertDialogAction onPress={cancel}>{CARD.cancel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </section>
  );
}
