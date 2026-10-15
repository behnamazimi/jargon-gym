"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { addToCollection } from "@/app/(private)/app/actions";
import { LandingCtas, SignedInCtas, SignedOutCtas } from "@/components/landing/landing-ctas";
import { SkeletonBar } from "@/components/page-skeleton";
import { Button, LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { hasAuthCookie } from "@/lib/auth/has-auth-cookie";
import type { CollectionMembership } from "@/lib/library/membership";

// Public pages are cached and rendered without a session. Both versions are in
// the page and the auth cookie, read before paint, picks one (see LandingCtas).
// A stale cookie just leads to the login page.
const BUTTON_CLASS =
  "group min-h-12 w-full gap-2 ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96] sm:w-auto";

type CtaCollection = { id: string; name: string; canAdd: boolean };

export function PublicCta({ collection }: { collection?: CtaCollection }) {
  if (!collection) return <LandingCtas />;

  return (
    <>
      <div className="signed-in:hidden">
        <SignedOutCtas />
      </div>
      <div className="hidden signed-in:block">
        <CollectionCta collection={collection} />
      </div>
    </>
  );
}

type CtaState = CollectionMembership | "checking" | "signed-out";

// The hero and the closing CTA show the same collection, so they share one
// answer: one request, and adding from either updates both.
const memberships = new Map<string, CtaState>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function setMembership(collectionId: string, state: CtaState) {
  memberships.set(collectionId, state);
  for (const listener of listeners) listener();
}

function subscribeMemberships(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function fetchMembership(collectionId: string): Promise<CtaState> {
  try {
    // A signed-out request is redirected to login; manual keeps that from loading the page.
    const response = await fetch(`/api/collections/${collectionId}/membership`, {
      redirect: "manual",
      cache: "no-store",
    });
    if (!response.ok) return "signed-out";
    const body = (await response.json()) as { state: CollectionMembership };
    return body.state;
  } catch {
    return "signed-out";
  }
}

function loadMembership(collectionId: string) {
  if (pending.has(collectionId)) return;
  pending.set(
    collectionId,
    fetchMembership(collectionId).then((state) => {
      pending.delete(collectionId);
      setMembership(collectionId, state);
    }),
  );
}

function CollectionCta({ collection }: { collection: CtaCollection }) {
  const state = useSyncExternalStore(
    subscribeMemberships,
    () => memberships.get(collection.id) ?? "checking",
    () => "checking" as const,
  );
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useMountEffect(() => {
    if (hasAuthCookie()) loadMembership(collection.id);
  });

  async function add() {
    setAdding(true);
    setMembership(collection.id, "added");
    const result = await addToCollection(collection.id);
    setAdding(false);
    if (result.error) {
      setMembership(collection.id, "available");
      toast(result.error, "destructive");
      return;
    }
    toast(`Added "${collection.name}"`, "success", {
      action: {
        label: "Start reading",
        onPress: () => router.push(`/app/read?collection=${collection.id}`),
      },
    });
  }

  if (state === "checking") return <SkeletonBar className="h-12 w-full rounded-field sm:w-44" />;
  if (state === "signed-out") return <SignedOutCtas />;

  if (state === "owned" || state === "added") {
    return (
      <LinkButton
        href={`/app/library?collection=${collection.id}`}
        size="lg"
        className={BUTTON_CLASS}
      >
        Open in library
        <ArrowRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      </LinkButton>
    );
  }

  if (!collection.canAdd) return <SignedInCtas />;

  return (
    <Button size="lg" onPress={() => void add()} isDisabled={adding} className={BUTTON_CLASS}>
      <Plus aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      Add to my library
    </Button>
  );
}
