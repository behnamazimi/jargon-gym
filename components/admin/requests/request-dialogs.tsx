"use client";

import { useState } from "react";
import {
  askRequest,
  declineRequest,
  mergeRequest,
  setNewDate,
} from "@/app/(private)/admin/requests/actions";
import { addExistingCollection } from "@/app/(private)/admin/requests/delivery-actions";
import { RequestDialog } from "@/components/admin/requests/request-dialog";
import { ADMIN_DECLINE_REASONS } from "@/lib/admin/requests/labels";
import type { AdminRequestDetail } from "@/lib/admin/requests/queries";

export type SimilarCollection = { id: string; name: string; terms: number };
export type SimilarRequest = { id: string; topic: string; status: string };

const ALREADY_IN_BROWSE = "already_in_browse";
const FIELD = "input input-bordered w-full";

export function AskDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [question, setQuestion] = useState("");
  return (
    <RequestDialog
      title="Ask a question"
      description="The request waits for their reply and the delivery clock pauses. They get an email."
      confirmLabel="Send question"
      canSubmit={question.trim().length > 0}
      onSubmit={() => askRequest(id, question)}
      onClose={onClose}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Question (up to 500 characters)</span>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={4}
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          autoFocus
        />
      </label>
    </RequestDialog>
  );
}

export function DeclineDialog({
  request,
  collections,
  onClose,
}: {
  request: AdminRequestDetail;
  collections: SimilarCollection[];
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [domainId, setDomainId] = useState("");
  const inBrowse = reason === ALREADY_IN_BROWSE;
  const merged = request.merged.length;

  return (
    <RequestDialog
      title={inBrowse ? "Add a Browse collection for them" : "Decline this request"}
      description={
        inBrowse
          ? "It's added to their Library and the request is marked ready. They get an email."
          : `They get an email with the reason${merged > 0 ? `, and so do the ${merged} merged request${merged === 1 ? "" : "s"}, which are declined too` : ""}.`
      }
      confirmLabel={inBrowse ? "Add it for them" : "Decline"}
      canSubmit={inBrowse ? domainId !== "" : reason !== ""}
      onSubmit={() =>
        inBrowse
          ? addExistingCollection(request.id, domainId)
          : declineRequest(request.id, reason, note)
      }
      onClose={onClose}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Reason</span>
        <select
          className="select select-bordered w-full"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="">Choose…</option>
          {Object.entries(ADMIN_DECLINE_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value={ALREADY_IN_BROWSE}>Already in Browse (add it for them)</option>
        </select>
      </label>
      {inBrowse ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm">Collection</span>
          <select
            className="select select-bordered w-full"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
          >
            <option value="">{collections.length === 0 ? "No close matches" : "Choose…"}</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name} ({collection.terms} terms)
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm">Short note (optional, shown to them)</span>
          <input
            className={FIELD}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      )}
    </RequestDialog>
  );
}

export function MergeDialog({
  id,
  requests,
  collections,
  onClose,
}: {
  id: string;
  requests: SimilarRequest[];
  collections: SimilarCollection[];
  onClose: () => void;
}) {
  const [target, setTarget] = useState("");
  const [kind, value] = target.split(":");
  const none = requests.length === 0 && collections.length === 0;

  return (
    <RequestDialog
      title="Merge this request"
      description="Into another open request, so one delivery reaches everyone, or into a Browse collection, which is added to their Library now."
      confirmLabel="Merge"
      canSubmit={target !== ""}
      onSubmit={() =>
        kind === "request" ? mergeRequest(id, value ?? "") : addExistingCollection(id, value ?? "")
      }
      onClose={onClose}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">Merge into</span>
        <select
          className="select select-bordered w-full"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">{none ? "Nothing similar found" : "Choose…"}</option>
          {requests.length > 0 ? (
            <optgroup label="Open requests">
              {requests.map((request) => (
                <option key={request.id} value={`request:${request.id}`}>
                  {request.topic}
                </option>
              ))}
            </optgroup>
          ) : null}
          {collections.length > 0 ? (
            <optgroup label="Browse collections">
              {collections.map((collection) => (
                <option key={collection.id} value={`collection:${collection.id}`}>
                  {collection.name} ({collection.terms} terms)
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
    </RequestDialog>
  );
}

export function DateDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [date, setDate] = useState("");
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  return (
    <RequestDialog
      title="Set a new date"
      description="They get one email with the new date. You can only do this once per request."
      confirmLabel="Send new date"
      canSubmit={date >= tomorrow}
      onSubmit={() => setNewDate(id, date)}
      onClose={onClose}
    >
      <label className="flex flex-col gap-1">
        <span className="text-sm">New estimate</span>
        <input
          type="date"
          min={tomorrow}
          className={FIELD}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
    </RequestDialog>
  );
}
