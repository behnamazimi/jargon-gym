"use client";

import { useState, useTransition } from "react";
import { resetAiCredits } from "@/app/(private)/admin/ai-credits/actions";
import { AdminAiCreditsGrantDialog } from "@/components/jargon/admin/admin-ai-credits-grant-dialog";
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

export function AdminAiCreditsUsage({ usage }: { usage: AiCreditUsageRow[] }) {
  const [grantEmail, setGrantEmail] = useState<string | null>(null);
  const [resetRow, setResetRow] = useState<AiCreditUsageRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    if (!resetRow) return;
    const userId = resetRow.userId;
    setError(null);
    setResetRow(null);

    startTransition(async () => {
      try {
        await resetAiCredits(userId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reset.");
      }
    });
  }

  return (
    <section aria-labelledby="ai-credits-usage" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ai-credits-usage" className="m-0 text-base font-semibold text-base-content">
          Usage
        </h2>
        <button
          type="button"
          className="btn btn-sm btn-outline min-h-11 transition-transform active:scale-[0.96] sm:min-h-8"
          onClick={() => setGrantEmail("")}
        >
          Grant credits
        </button>
      </div>
      {error ? <p className="m-0 text-sm text-error">{error}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th className="text-right">Used</th>
              <th className="text-right">Granted</th>
              <th className="text-right">Left</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {usage.map((row) => (
              <tr key={row.userId}>
                <td>
                  <p className="m-0 font-medium text-base-content">{row.email}</p>
                  <p className="m-0 text-xs text-base-content/50">
                    Last activity {new Date(row.lastActivity).toLocaleDateString()}
                  </p>
                </td>
                <td className="text-right tabular-nums">{row.spent}</td>
                <td className="text-right tabular-nums">{row.granted}</td>
                <td className="text-right tabular-nums">{row.remaining}</td>
                <td className="whitespace-nowrap text-right">
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
                    onClick={() => setGrantEmail(row.email)}
                  >
                    Grant
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost transition-transform active:scale-[0.96]"
                    disabled={isPending}
                    onClick={() => setResetRow(row)}
                  >
                    Reset
                  </button>
                </td>
              </tr>
            ))}
            {usage.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-base-content/50">
                  No one has used AI credits yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="m-0 text-xs text-base-content/60">
        Used counts credits spent since the person&apos;s last reset. Refunded requests aren&apos;t
        counted.
      </p>

      <AdminAiCreditsGrantDialog
        email={grantEmail}
        onOpenChange={(open) => !open && setGrantEmail(null)}
      />

      <AlertDialog isOpen={resetRow !== null} onOpenChange={(open) => !open && setResetRow(null)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset usage?</AlertDialogTitle>
          <AlertDialogDescription>
            Clears usage for {resetRow?.email} from now on. Every record stays, and credits you
            granted are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onPress={handleReset}>
            Reset usage
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </section>
  );
}
