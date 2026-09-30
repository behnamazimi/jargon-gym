"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteUser,
  removeUserApiKey,
  setUserSuspended,
} from "@/app/(private)/admin/people/[id]/actions";
import { ReasonConfirmDialog } from "@/components/admin/reason-confirm-dialog";
import type { AdminPerson } from "@/lib/admin/people/person";

type Asking = "suspend" | "reactivate" | "key" | "delete" | null;

function DangerRow({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-48 flex-1">
        <h3 className="m-0 text-sm font-semibold">{title}</h3>
        <p className="m-0 text-sm text-base-content/65">{text}</p>
      </div>
      {children}
    </div>
  );
}

function DangerDialogs({
  person,
  asking,
  onClose,
}: {
  person: AdminPerson;
  asking: Asking;
  onClose: () => void;
}) {
  const router = useRouter();

  return (
    <>
      {asking === "suspend" || asking === "reactivate" ? (
        <ReasonConfirmDialog
          title={asking === "suspend" ? "Suspend this account?" : "Reactivate this account?"}
          description={
            asking === "suspend"
              ? `${person.email} is signed out everywhere and can't sign in until you reactivate them.`
              : `${person.email} can sign in again. They need to log in again.`
          }
          confirmLabel={asking === "suspend" ? "Suspend" : "Reactivate"}
          onSubmit={({ reason }) =>
            setUserSuspended({ userId: person.id, suspended: asking === "suspend", reason })
          }
          onClose={onClose}
        />
      ) : null}

      {asking === "key" ? (
        <ReasonConfirmDialog
          title="Remove their API key?"
          description={`${person.email} loses their saved key. They can save a new one in settings.`}
          confirmLabel="Remove key"
          onSubmit={({ reason }) => removeUserApiKey({ userId: person.id, reason })}
          onClose={onClose}
        />
      ) : null}

      {asking === "delete" ? (
        <ReasonConfirmDialog
          title="Delete this account?"
          description={`This can't be undone. It deletes ${person.email}, their progress, settings, key and ${person.ownedCollections} ${person.ownedCollections === 1 ? "collection" : "collections"}.`}
          confirmLabel="Delete account"
          confirmText={person.email}
          onSubmit={({ reason, typed }) =>
            deleteUser({ userId: person.id, reason, confirmEmail: typed })
          }
          onSuccess={() => router.push("/admin/people?view=members")}
          onClose={onClose}
        />
      ) : null}
    </>
  );
}

export function DangerZone({ person }: { person: AdminPerson }) {
  const [asking, setAsking] = useState<Asking>(null);
  const close = () => setAsking(null);
  const suspended = person.suspendedAt !== null;
  const blocked = person.peopleUsingCollections > 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-error/40 px-4 py-4">
      {person.banMismatch ? (
        <p role="alert" className="m-0 text-sm text-warning">
          Their sign-in ban and suspended flag don&apos;t match, which only a manual database edit
          causes.{" "}
          {suspended
            ? "Suspend again to repair it."
            : "Reactivate to clear it, or suspend to make it match."}
        </p>
      ) : null}

      <DangerRow
        title={suspended ? "Reactivate account" : "Suspend account"}
        text={
          suspended
            ? "They are signed out and can't use the app, Telegram or the widget. Reactivating lets them sign in again."
            : "Signs them out everywhere and blocks sign-in, Telegram, the widget and AI. Nothing is deleted."
        }
      >
        <button
          type="button"
          className={`btn btn-sm ${suspended ? "btn-outline" : "btn-error btn-outline"}`}
          onClick={() => setAsking(suspended ? "reactivate" : "suspend")}
        >
          {suspended ? "Reactivate" : "Suspend"}
        </button>
      </DangerRow>

      <DangerRow
        title="Remove their API key"
        text={
          person.key
            ? "They fall back to the app's key and spend credits until they save a key again."
            : "They have no key saved."
        }
      >
        <button
          type="button"
          className="btn btn-error btn-outline btn-sm"
          disabled={!person.key}
          onClick={() => setAsking("key")}
        >
          Remove key
        </button>
      </DangerRow>

      <DangerRow
        title="Delete account"
        text={
          blocked
            ? `Can't delete: ${person.peopleUsingCollections} other ${person.peopleUsingCollections === 1 ? "person uses" : "people use"} their collections. Make those collections private first.`
            : "Permanently deletes the account and everything in it. The waitlist entry stays."
        }
      >
        <button
          type="button"
          className="btn btn-error btn-sm"
          disabled={blocked}
          onClick={() => setAsking("delete")}
        >
          Delete account
        </button>
      </DangerRow>

      <DangerDialogs person={person} asking={asking} onClose={close} />
    </div>
  );
}
