"use server";

import { z } from "zod";
import { AdminError } from "@/lib/admin/admin-error";
import { runAdminAction } from "@/lib/admin/action";
import { writeAudit } from "@/lib/admin/audit";
import {
  canNarrateCollection,
  listAllCollectionsForAdmin,
} from "@/lib/admin/collections/list-all-collections";
import {
  DEFAULT_NARRATION_MODE,
  getNarrationMode,
  NARRATION_MODES,
  type NarrationMode,
} from "@/lib/narration/mode";

const modeSchema = z.enum(NARRATION_MODES);

/** Changing the mode makes the collection's clips stale; nothing is regenerated until a sync runs. */
export async function setNarrationMode(collectionId: string, mode: NarrationMode) {
  return runAdminAction(
    async ({ supabase, user }): Promise<{ mode: NarrationMode }> => {
      const to = modeSchema.parse(mode);
      const collection = (await listAllCollectionsForAdmin(supabase, user.id)).find(
        (row) => row.id === collectionId,
      );
      if (!collection || !canNarrateCollection(collection)) {
        throw new AdminError("Collection not found.");
      }

      const from = await getNarrationMode(supabase, collectionId);
      if (from === to) return { mode: to };

      // A collection with no row already means the default, so going back to it removes the row.
      const { error } =
        to === DEFAULT_NARRATION_MODE
          ? await supabase
              .from("collection_narration_settings")
              .delete()
              .eq("collection_id", collectionId)
          : await supabase
              .from("collection_narration_settings")
              .upsert({ collection_id: collectionId, mode: to }, { onConflict: "collection_id" });
      if (error) throw error;

      await writeAudit(supabase, {
        action: "app.narration_mode_set",
        targetType: "collection",
        targetId: collectionId,
        details: { from, to, name: collection.name },
      });
      return { mode: to };
    },
    { revalidate: ["/admin/collections", "/admin/collections/[id]"] },
  );
}
