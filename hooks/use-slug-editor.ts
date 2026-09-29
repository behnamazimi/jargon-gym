"use client";

import { useState, type FormEvent } from "react";
import { checkDomainSlug, updateDomainSlug } from "@/app/(private)/admin/collections/actions";
import { useToast } from "@/components/ui/toast";
import { useAdminAction } from "@/hooks/use-admin-action";
import type { SlugCheck } from "@/lib/jargon/admin/slug-check";

type Checked = { text: string; result: SlugCheck };

/** The address dialog's state: what was typed, the last check, and saving. Saving needs a
 *  check of exactly the current text, so any edit makes the check stale. */
export function useSlugEditor(collectionId: string, initial: string, onSaved: () => void) {
  const [text, setText] = useState(initial);
  const [checked, setChecked] = useState<Checked | null>(null);
  const check = useAdminAction();
  const save = useAdminAction();
  const { toast } = useToast();

  const current = checked?.text === text ? checked.result : null;
  const busy = check.isPending || save.isPending;

  function handleCheck(event: FormEvent) {
    event.preventDefault();
    const asked = text;
    setChecked(null);
    save.clearError();
    void check.run(() => checkDomainSlug(collectionId, asked), {
      onSuccess: (result) => setChecked({ text: asked, result }),
    });
  }

  function handleSave() {
    if (!current) return;
    check.clearError();
    void save.run(() => updateDomainSlug(collectionId, text, current.slug), {
      onSuccess: ({ slug }) => {
        toast(`The address is now /j/${slug}.`);
        onSaved();
      },
    });
  }

  return {
    text,
    setText,
    current,
    busy,
    canSave: Boolean(current?.valid && !current.taken) && !save.isPending,
    checking: check.isPending,
    saving: save.isPending,
    error: check.error ?? save.error,
    handleCheck,
    handleSave,
  };
}
