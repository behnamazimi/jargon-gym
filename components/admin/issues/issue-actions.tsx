"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteIssue, setIssueStatus } from "@/app/(private)/admin/issues/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { IssueStatus } from "@/lib/issues/schema";

export function IssueActions({ id, status }: { id: string; status: IssueStatus }) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { run, isPending, error } = useAdminAction();

  function move(next: IssueStatus, message: string) {
    void run(() => setIssueStatus({ id, status: next }), { successMessage: message });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "new" ? (
          <>
            <Button
              type="button"
              isDisabled={isPending}
              onPress={() => move("done", "Marked done")}
            >
              Done
            </Button>
            <Button
              type="button"
              variant="outline"
              isDisabled={isPending}
              onPress={() => move("wont_do", "Marked won't do")}
            >
              Won't do
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            isDisabled={isPending}
            onPress={() => move("new", "Reopened")}
          >
            Reopen
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          className="text-error-text"
          isDisabled={isPending}
          onPress={() => setConfirmDelete(true)}
        >
          Delete
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <ConfirmDialog
        isOpen={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this issue?"
        description="The text and any screenshot are removed for good."
        confirmLabel="Delete"
        onConfirm={() =>
          void run(() => deleteIssue({ id }), {
            successMessage: "Issue deleted",
            onSuccess: () => router.push("/admin/issues"),
          })
        }
      />
    </div>
  );
}
