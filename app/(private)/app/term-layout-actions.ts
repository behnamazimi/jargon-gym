"use server";

import { requireAuthenticatedClient } from "@/lib/auth/require-session";
import {
  canStoreCollectionPlacement,
  isDomainId,
  parsePlacement,
  withCollectionPlacement,
  withDefaultPlacement,
  withoutCollectionPlacement,
  type TermLayout,
} from "@/lib/terms/term-layout";
import { loadTermLayout, saveTermLayout } from "@/lib/terms/term-layout-repository";

export type TermLayoutChange =
  | { scope: "default"; placement: unknown }
  | { scope: "collection"; domainId: string; placement: unknown }
  | { scope: "reset-collection"; domainId: string };

export async function saveTermLayoutAction(
  change: TermLayoutChange,
): Promise<{ error?: string; layout?: TermLayout }> {
  const auth = await requireAuthenticatedClient();
  if ("error" in auth) return { error: "Log in to continue." };

  if (change.scope !== "default" && !isDomainId(change.domainId)) {
    return { error: "Unknown collection." };
  }
  const placement = change.scope === "reset-collection" ? null : parsePlacement(change.placement);
  if (change.scope !== "reset-collection" && !placement) return { error: "Unknown layout." };

  try {
    const current = await loadTermLayout(auth.supabase, auth.user.id);
    let next: TermLayout;
    if (change.scope === "default" && placement) {
      next = withDefaultPlacement(current, placement);
    } else if (change.scope === "collection" && placement) {
      if (!canStoreCollectionPlacement(current, change.domainId)) {
        return { error: "Too many collections have their own layout. Reset one first." };
      }
      next = withCollectionPlacement(current, change.domainId, placement);
    } else if (change.scope === "reset-collection") {
      next = withoutCollectionPlacement(current, change.domainId);
    } else {
      return { error: "Unknown layout." };
    }
    await saveTermLayout(auth.supabase, auth.user.id, next);
    return { layout: next };
  } catch (err) {
    console.error("saveTermLayoutAction failed:", err);
    return { error: "Couldn't save the layout. Try again." };
  }
}
