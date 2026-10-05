"use client";

import { track } from "@/lib/analytics/track";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import { CAPTURE_COPY } from "@/lib/capture/copy";
import type { DomainLanguage } from "@/lib/terms/languages";

/** For someone with no collection yet: create one, then reload this page with it chosen. */
export function FirstCollectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createEmptyCollection, isBusy, error } = useCollectionActions();
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<DomainLanguage>("en");
  const canCreate = name.trim().length > 0 && !isBusy;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    await createEmptyCollection({ name: name.trim(), language }, (domainId) => {
      track("collection_created", { language, creation_source: "first_capture" });
      const params = new URLSearchParams(searchParams.toString());
      params.set("to", domainId);
      router.replace(`/app/capture?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="m-0 text-lg font-medium">{CAPTURE_COPY.firstTitle}</h2>
        <p className="m-0 text-sm text-base-content/70">{CAPTURE_COPY.firstBody}</p>
      </div>
      <Field>
        <FieldLabel htmlFor="first-collection-name">{CAPTURE_COPY.firstName}</FieldLabel>
        <Input
          id="first-collection-name"
          value={name}
          maxLength={100}
          className="text-base"
          placeholder={CAPTURE_COPY.firstNamePlaceholder}
          disabled={isBusy}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel>{CAPTURE_COPY.language}</FieldLabel>
        <LanguageToggle value={language} onChange={setLanguage} isDisabled={isBusy} />
      </Field>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="min-h-12 w-full" isDisabled={!canCreate}>
        {isBusy ? CAPTURE_COPY.creating : CAPTURE_COPY.firstCreate}
      </Button>
    </form>
  );
}
