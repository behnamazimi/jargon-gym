"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCollection } from "@/app/(private)/app/actions";
import { Button, LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import { appendNextParam } from "@/lib/auth/safe-next-path";
import type { CollectionMembership } from "@/lib/library/membership";
import { cn } from "@/lib/utils";

/** null: nobody is signed in. */
export type SharedCtaState = CollectionMembership | null;

type SharedCollectionCtaProps = {
  collection: { id: string; name: string };
  state: SharedCtaState;
  compact?: boolean;
};

export function SharedCollectionCta({ collection, state, compact }: SharedCollectionCtaProps) {
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const libraryHref = `/app/library?collection=${collection.id}`;
  const size = compact ? "default" : "lg";
  const className = cn(
    "w-full gap-2 transition-transform duration-150 ease-out active:scale-[0.96] sm:w-auto",
    compact ? "min-h-11" : "min-h-12 ps-5 pe-4",
  );

  async function add() {
    setAdding(true);
    const result = await addToCollection(collection.id);
    if (result.error) {
      setAdding(false);
      toast(result.error, "destructive");
      return;
    }
    track("shared_landing_added");
    toast(`Added "${collection.name}"`, "success");
    router.push(libraryHref);
  }

  if (state === null) {
    return (
      <LinkButton
        href={appendNextParam("/login", `/c/${collection.id}`)}
        size={size}
        className={className}
      >
        Log in to add
        <ArrowRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      </LinkButton>
    );
  }

  if (state === "available") {
    return (
      <Button size={size} onPress={() => void add()} isDisabled={adding} className={className}>
        <Plus aria-hidden className="size-4 shrink-0" strokeWidth={2} />
        {adding ? "Adding…" : "Add to my library"}
      </Button>
    );
  }

  return (
    <LinkButton href={libraryHref} size={size} className={className}>
      Open in library
      <ArrowRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
    </LinkButton>
  );
}
