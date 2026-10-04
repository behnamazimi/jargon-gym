"use client";

import { useState, type FormEvent } from "react";
import { createSharedCode, setSharedCodeActive } from "@/app/(private)/admin/people/codes-actions";
import { useToast } from "@/components/ui/toast";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminSharedCode, SharedCodeStatus } from "@/lib/admin/people/codes";

const statusBadgeClass: Record<SharedCodeStatus, string> = {
  active: "badge-success",
  paused: "badge-neutral",
  full: "badge-warning",
  expired: "badge-neutral",
};

const statusLabel: Record<SharedCodeStatus, string> = {
  active: "Active",
  paused: "Paused",
  full: "Full",
  expired: "Expired",
};

function CreateCodeForm() {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("50");
  const [endDate, setEndDate] = useState("");
  const { run, isPending, error } = useAdminAction();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() => createSharedCode({ code, label, maxUses: Number(maxUses), endDate }), {
      onSuccess: () => {
        setCode("");
        setLabel("");
      },
      successMessage: "Code created.",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Code</span>
        <input
          type="text"
          required
          minLength={4}
          maxLength={32}
          autoCapitalize="characters"
          spellCheck={false}
          className="input input-bordered w-40 uppercase"
          placeholder="LAUNCH50"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1">
        <span className="text-sm">Label</span>
        <input
          type="text"
          required
          maxLength={60}
          className="input input-bordered w-full"
          placeholder="Where you share it, e.g. Newsletter"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Seats</span>
        <input
          type="number"
          required
          min={2}
          max={10000}
          className="input input-bordered w-24"
          value={maxUses}
          onChange={(event) => setMaxUses(event.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">Last day (UTC)</span>
        <input
          type="date"
          required
          className="input input-bordered"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create code"}
      </button>
      {error ? (
        <p role="alert" className="m-0 w-full text-sm text-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function CodeRow({ row, origin }: { row: AdminSharedCode; origin: string }) {
  const { run, isPending, error } = useAdminAction();
  const { toast } = useToast();
  const paused = row.status === "paused";
  const link = `${origin}/signup?ref=${encodeURIComponent(row.code)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      toast("Signup link copied.");
    } catch {
      toast("Couldn't copy. Select the code and copy it by hand.", "destructive");
    }
  }

  return (
    <tr>
      <td className="font-mono font-medium text-base-content">{row.code}</td>
      <td>{row.label}</td>
      <td>
        <span className={`badge ${statusBadgeClass[row.status]}`}>{statusLabel[row.status]}</span>
        {error ? (
          <p role="alert" className="mt-1 text-sm text-error">
            {error}
          </p>
        ) : null}
      </td>
      <td>
        {row.useCount} of {row.maxUses}
      </td>
      <td className="text-base-content/65">{formatAdminDate(row.expiresAt)}</td>
      <td className="text-right whitespace-nowrap">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => void handleCopy()}>
          Copy link
        </button>
        {row.status === "active" || paused ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={isPending}
            onClick={() => void run(() => setSharedCodeActive(row.id, paused))}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        ) : null}
      </td>
    </tr>
  );
}

export function CodesTable({ rows, origin }: { rows: AdminSharedCode[]; origin: string }) {
  return (
    <div className="flex flex-col gap-4">
      <CreateCodeForm />
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Status</th>
              <th>Seats used</th>
              <th>Last day</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CodeRow key={row.id} row={row} origin={origin} />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-base-content/50">
                  No shared codes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
