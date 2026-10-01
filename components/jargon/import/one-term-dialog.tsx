"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CollectionSelect } from "@/components/jargon/collection-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ImportDestination } from "@/lib/jargon/import/import-collections";

export function OneTermDialog({
  collections,
  isOpen,
  onOpenChange,
}: {
  collections: ImportDestination[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState(collections[0]?.id ?? "");

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Which collection?</DialogTitle>
        <DialogDescription>Pick where the new term goes.</DialogDescription>
      </DialogHeader>
      <CollectionSelect
        mode="local"
        aria-label="Collection"
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        value={chosen}
        className="w-full"
        onChange={setChosen}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onPress={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          isDisabled={!chosen}
          onPress={() => router.push(`/jargon?domain=${chosen}&add=1`)}
        >
          Continue
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
