"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { addToCollection } from "@/app/(private)/app/actions";
import { LandingCtas } from "@/components/landing/landing-ctas";
import { Button, LinkButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMountEffect } from "@/hooks/use-mount-effect";
import type { CollectionMembership } from "@/lib/library/membership";

const subscribe = () => () => {};

// Public pages are cached and rendered without a session, so the server always
// sends the visitor CTA. The auth cookie is readable in the browser, which is
// enough to tell a signed-in user apart without a request. A stale cookie just
// leads to the login page.
function hasAuthCookie() {
  return document.cookie.includes("-auth-token");
}

const BUTTON_CLASS =
  "group min-h-12 w-full gap-2 ps-5 pe-4 transition-transform duration-150 ease-out active:scale-[0.96] sm:w-auto";

type CtaCollection = { id: string; name: string; canAdd: boolean };

export function PublicCta({ collection }: { collection?: CtaCollection }) {
  const signedIn = useSyncExternalStore(subscribe, hasAuthCookie, () => false);

  if (signedIn && collection) return <CollectionCta collection={collection} />;
  return <LandingCtas isLoggedIn={signedIn} />;
}

type CtaState = CollectionMembership | "checking" | "signed-out";

// The hero and the closing CTA show the same collection, so they share one
// answer: one request, and adding from either updates both.
const memberships = new Map<string, CtaState>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function setMembership(domainId: string, state: CtaState) {
  memberships.set(domainId, state);
  for (const listener of listeners) listener();
}

function subscribeMemberships(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function fetchMembership(domainId: string): Promise<CtaState> {
  try {
    // A signed-out request is redirected to login; manual keeps that from loading the page.
    const response = await fetch(`/api/collections/${domainId}/membership`, {
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

function loadMembership(domainId: string) {
  if (pending.has(domainId)) return;
  pending.set(
    domainId,
    fetchMembership(domainId).then((state) => {
      pending.delete(domainId);
      setMembership(domainId, state);
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

  useMountEffect(() => loadMembership(collection.id));

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
        onPress: () => router.push(`/app/read?domain=${collection.id}`),
      },
    });
  }

  if (state === "checking" || state === "signed-out") return <LandingCtas isLoggedIn={false} />;

  if (state === "owned" || state === "added") {
    return (
      <LinkButton href={`/app/library?domain=${collection.id}`} size="lg" className={BUTTON_CLASS}>
        Open in library
        <ArrowRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      </LinkButton>
    );
  }

  if (!collection.canAdd) return <LandingCtas isLoggedIn />;

  return (
    <Button size="lg" onPress={() => void add()} isDisabled={adding} className={BUTTON_CLASS}>
      <Plus aria-hidden className="size-4 shrink-0" strokeWidth={2} />
      Add to my library
    </Button>
  );
}
