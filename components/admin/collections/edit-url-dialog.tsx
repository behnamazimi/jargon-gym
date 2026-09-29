"use client";

import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSlugEditor } from "@/hooks/use-slug-editor";
import { slugify } from "@/lib/jargon/slug";
import { describeSlugCheck } from "@/lib/jargon/admin/slug-check";
import type { AdminCollectionRow } from "@/lib/jargon/admin/list-all-collections";

function PublishedWarning({ slug }: { slug: string | null }) {
  return (
    <p className="m-0 text-sm text-warning">
      This collection is published.
      {slug ? ` /j/${slug} and the term pages under it stop working when you save.` : null}
    </p>
  );
}

function EditUrlForm({
  collection,
  onClose,
}: {
  collection: AdminCollectionRow;
  onClose: () => void;
}) {
  const editor = useSlugEditor(collection.id, collection.slug ?? "", onClose);

  return (
    <form onSubmit={editor.handleCheck} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Edit the address</DialogTitle>
        <DialogDescription>
          The public page for {collection.name} lives at this address.
        </DialogDescription>
      </DialogHeader>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Address</span>
        <input
          type="text"
          className="input input-bordered w-full"
          value={editor.text}
          readOnly={editor.busy}
          maxLength={300}
          onChange={(event) => editor.setText(event.target.value)}
        />
        <span className="text-xs text-base-content/60">
          Preview: /j/{slugify(editor.text).slice(0, 100) || "…"}
        </span>
      </label>

      {editor.current ? (
        <p role="status" className="m-0 text-sm text-base-content/65">
          {describeSlugCheck(editor.current)}
        </p>
      ) : null}
      {collection.isPublic ? <PublishedWarning slug={collection.slug} /> : null}
      {editor.error ? (
        <p role="alert" className="m-0 text-sm text-error">
          {editor.error}
        </p>
      ) : null}

      <DialogFooter>
        <button type="button" className="btn btn-ghost" disabled={editor.busy} onClick={onClose}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-outline"
          disabled={editor.busy || !editor.text.trim()}
        >
          {editor.checking ? "Checking…" : "Check"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!editor.canSave}
          onClick={editor.handleSave}
        >
          {editor.saving ? "Saving…" : "Save"}
        </button>
      </DialogFooter>
    </form>
  );
}

export function EditUrlDialog({
  collection,
  isOpen,
  onOpenChange,
}: {
  collection: AdminCollectionRow;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={false} className="max-w-md">
      <EditUrlForm collection={collection} onClose={() => onOpenChange(false)} />
    </Dialog>
  );
}
