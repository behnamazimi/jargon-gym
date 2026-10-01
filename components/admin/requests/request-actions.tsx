"use client";

import { useState } from "react";
import { acceptRequest } from "@/app/(private)/admin/requests/actions";
import { resendRequestEmail } from "@/app/(private)/admin/requests/delivery-actions";
import {
  AskDialog,
  DateDialog,
  DeclineDialog,
  MergeDialog,
  type SimilarCollection,
  type SimilarRequest,
} from "@/components/admin/requests/request-dialogs";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";
import { availableActions } from "@/lib/admin/requests/available";
import type { AdminRequestDetail } from "@/lib/admin/requests/queries";

type Dialog = "ask" | "decline" | "merge" | "date" | null;

export function RequestActions({
  request,
  similarRequests,
  similarCollections,
}: {
  request: AdminRequestDetail;
  similarRequests: SimilarRequest[];
  similarCollections: SimilarCollection[];
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const { run, isPending, error } = useAdminAction();
  const can = availableActions(request);
  const close = () => setDialog(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {can.accept ? (
          <Button
            type="button"
            isDisabled={isPending}
            onPress={() => void run(() => acceptRequest(request.id))}
          >
            Accept
          </Button>
        ) : null}
        {can.ask ? (
          <Button type="button" variant="outline" onPress={() => setDialog("ask")}>
            Ask
          </Button>
        ) : null}
        {can.merge ? (
          <Button type="button" variant="outline" onPress={() => setDialog("merge")}>
            Merge
          </Button>
        ) : null}
        {can.decline ? (
          <Button type="button" variant="outline" onPress={() => setDialog("decline")}>
            Decline
          </Button>
        ) : null}
        {can.newDate ? (
          <Button type="button" variant="outline" onPress={() => setDialog("date")}>
            Set new date
          </Button>
        ) : null}
        {can.resend ? (
          <Button
            type="button"
            variant={request.emailFailed ? "destructive" : "ghost"}
            isDisabled={isPending}
            onPress={() =>
              void run(() => resendRequestEmail(request.id), { successMessage: "Email sent" })
            }
          >
            {request.emailFailed ? "Email failed · Resend" : "Resend email"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}

      {dialog === "ask" ? <AskDialog id={request.id} onClose={close} /> : null}
      {dialog === "decline" ? (
        <DeclineDialog request={request} collections={similarCollections} onClose={close} />
      ) : null}
      {dialog === "merge" ? (
        <MergeDialog
          id={request.id}
          requests={similarRequests}
          collections={similarCollections}
          onClose={close}
        />
      ) : null}
      {dialog === "date" ? <DateDialog id={request.id} onClose={close} /> : null}
    </div>
  );
}
