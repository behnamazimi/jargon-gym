"use client";

import { useState } from "react";
import { resetAiCredits } from "@/app/(private)/admin/ai/credits/actions";
import { AdminSection } from "@/components/admin/admin-section";
import { useAdminAction } from "@/hooks/use-admin-action";
import { AdminAiCreditsGrantDialog } from "@/components/jargon/admin/admin-ai-credits-grant-dialog";
import { UsageCards, UsageTable } from "@/components/jargon/admin/admin-ai-credits-usage-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { AiCreditUsageRow } from "@/lib/ai-credits/admin";

const USAGE_LIST_LIMIT = 200;

export function AdminAiCreditsUsage({ usage }: { usage: AiCreditUsageRow[] }) {
  const [grantEmail, setGrantEmail] = useState<string | null>(null);
  const [resetRow, setResetRow] = useState<AiCreditUsageRow | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const { run, isPending, error } = useAdminAction();

  function handleReset() {
    if (!resetRow) return;
    const userId = resetRow.userId;
    setResetOpen(false);
    void run(() => resetAiCredits(userId), { successMessage: "Usage reset." });
  }

  function askToReset(row: AiCreditUsageRow) {
    setResetRow(row);
    setResetOpen(true);
  }

  return (
    <AdminSection
      id="ai-credits-usage"
      title="Usage"
      action={
        <button
          type="button"
          className="btn btn-outline min-h-11 transition-transform active:scale-[0.96] md:btn-sm md:min-h-8"
          onClick={() => setGrantEmail("")}
        >
          Grant credits
        </button>
      }
    >
      {error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {error}
        </p>
      ) : null}

      {usage.length === 0 ? (
        <p className="m-0 rounded-lg border border-base-300 px-4 py-6 text-center text-sm text-base-content/50">
          No one has used AI credits yet.
        </p>
      ) : (
        <>
          <UsageCards
            usage={usage}
            isPending={isPending}
            onGrant={setGrantEmail}
            onReset={askToReset}
          />
          <UsageTable
            usage={usage}
            isPending={isPending}
            onGrant={setGrantEmail}
            onReset={askToReset}
          />
        </>
      )}

      <p className="m-0 text-xs text-base-content/60">
        Used counts credits spent since the person&apos;s last reset. Refunded requests aren&apos;t
        counted.
        {usage.length >= USAGE_LIST_LIMIT
          ? ` Showing the ${USAGE_LIST_LIMIT} most recently active people. To help someone else, use Grant credits with their email.`
          : ""}
      </p>

      <AdminAiCreditsGrantDialog
        email={grantEmail}
        onOpenChange={(open) => !open && setGrantEmail(null)}
      />

      <AlertDialog isOpen={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset usage?</AlertDialogTitle>
          <AlertDialogDescription>
            {resetRow?.email} gets their full allowance back, from now on. Their history stays on
            record, and credits you granted are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onPress={handleReset}>Reset usage</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </AdminSection>
  );
}
