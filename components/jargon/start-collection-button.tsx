"use client";

import { useState } from "react";
import { CreateCollectionDialog } from "@/components/jargon/create-collection-dialog";
import { Button } from "@/components/ui/button";

export function StartCollectionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onPress={() => setIsOpen(true)}>
        Start an empty collection
      </Button>
      <CreateCollectionDialog isOpen={isOpen} onOpenChange={setIsOpen} existingCollections={[]} />
    </>
  );
}
