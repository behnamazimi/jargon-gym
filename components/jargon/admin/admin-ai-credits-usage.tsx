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

const USAGE_LIST_LIMIT = 200;

function RowActions({
  row,
  isPending,
  onGrant,
  onReset,
  className,
}: {
  row: AiCreditUsageRow;
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
  className: string;
}) {
  return (
    <>
      <button
        type="button"
        className={`btn btn-outline transition-transform active:scale-[0.96] ${className}`}
        onClick={() => onGrant(row.email)}
      >
        Grant
      </button>
      <button
        type="button"
        className={`btn btn-outline transition-transform active:scale-[0.96] ${className}`}
        disabled={isPending}
        onClick={() => onReset(row)}
      >
        Reset
      </button>
    </>
  );
}

function UsageCards({
  usage,
  isPending,
  onGrant,
  onReset,
}: {
  usage: AiCreditUsageRow[];
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
}) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0 md:hidden">
      {usage.map((row) => (
        <li key={row.userId} className="flex flex-col gap-3 rounded-lg border border-base-300 p-3">
          <div className="min-w-0">
            <p className="m-0 truncate font-medium text-base-content">{row.email}</p>
            <p className="m-0 text-xs text-base-content/50">
              Last activity {new Date(row.lastActivity).toLocaleDateString()}
            </p>
          </div>
          <dl className="m-0 grid grid-cols-3 gap-2 text-center">
            {[
              ["Used", row.spent],
              ["Granted", row.granted],
              ["Left", row.remaining],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-base-200/50 px-2 py-1.5">
                <dd className="m-0 text-base font-semibold tabular-nums text-base-content">
                  {value}
                </dd>
                <dt className="text-xs text-base-content/65">{label}</dt>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-2 gap-2">
            <RowActions
              row={row}
              isPending={isPending}
              onGrant={onGrant}
              onReset={onReset}
              className="min-h-11"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function UsageTable({
  usage,
  isPending,
  onGrant,
  onReset,
}: {
  usage: AiCreditUsageRow[];
  isPending: boolean;
  onGrant: (email: string) => void;
  onReset: (row: AiCreditUsageRow) => void;
}) {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-base-300 md:block">
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
                <div className="flex justify-end gap-2">
                  <RowActions
                    row={row}
                    isPending={isPending}
                    onGrant={onGrant}
                    onReset={onReset}
                    className="btn-sm"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminAiCreditsUsage({ usage }: { usage: AiCreditUsageRow[] }) {
  const [grantEmail, setGrantEmail] = useState<string | null>(null);
  const [resetRow, setResetRow] = useState<AiCreditUsageRow | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    if (!resetRow) return;
    const userId = resetRow.userId;
    setError(null);
    setResetOpen(false);

    startTransition(async () => {
      const result = await resetAiCredits(userId);
      if (result.error) setError(result.error);
    });
  }

  function askToReset(row: AiCreditUsageRow) {
    setResetRow(row);
    setResetOpen(true);
  }

  return (
    <section aria-labelledby="ai-credits-usage" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ai-credits-usage" className="m-0 text-base font-semibold text-base-content">
          Usage
        </h2>
        <button
          type="button"
          className="btn btn-outline min-h-11 transition-transform active:scale-[0.96] md:btn-sm md:min-h-8"
          onClick={() => setGrantEmail("")}
        >
          Grant credits
        </button>
      </div>
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
    </section>
  );
}
