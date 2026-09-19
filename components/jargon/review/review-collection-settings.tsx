"use client";

import { Check } from "lucide-react";
import { Button as ButtonPrimitive } from "react-aria-components";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { allCollectionsTermCount } from "@/lib/study/count";
import type { StudyCollection } from "@/lib/study/types";
import { cn } from "@/lib/utils";

type ReviewCollectionSettingsProps = {
  collections: StudyCollection[];
  selectedCollectionId: string;
  rememberOnDevice: boolean;
  isDisabled?: boolean;
  onCollectionChange: (collectionId: string) => void;
  onRememberChange: (remember: boolean) => void;
};

function selectedCollectionLabel(collectionId: string, collections: StudyCollection[]): string {
  if (collectionId === "all") return "All collections";
  return (
    collections.find((collection) => collection.id === collectionId)?.name ?? "All collections"
  );
}

export function ReviewCollectionSettings({
  collections,
  selectedCollectionId,
  rememberOnDevice,
  isDisabled,
  onCollectionChange,
  onRememberChange,
}: ReviewCollectionSettingsProps) {
  const allCount = allCollectionsTermCount(collections);

  return (
    <DropdownMenuTrigger>
      <ButtonPrimitive
        type="button"
        isDisabled={isDisabled}
        className="select select-sm w-fit max-w-full min-w-0 font-normal"
        aria-label="Collection"
      >
        <span className="truncate">
          {selectedCollectionLabel(selectedCollectionId, collections)}
        </span>
      </ButtonPrimitive>
      <DropdownMenu className="min-w-56" placement="bottom start">
        <DropdownMenuLabel>Collection</DropdownMenuLabel>
        <DropdownMenuItem id="all" onAction={() => onCollectionChange("all")}>
          <Check
            className={cn("size-3.5", selectedCollectionId !== "all" && "invisible")}
            aria-hidden
            strokeWidth={1.5}
          />
          All active collections ({allCount})
        </DropdownMenuItem>
        {collections.map((collection) => (
          <DropdownMenuItem
            key={collection.id}
            id={collection.id}
            onAction={() => onCollectionChange(collection.id)}
          >
            <Check
              className={cn("size-3.5", selectedCollectionId !== collection.id && "invisible")}
              aria-hidden
              strokeWidth={1.5}
            />
            {collection.name}
            {collection.termCount === undefined ? "" : ` (${collection.termCount})`}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onAction={() => onRememberChange(!rememberOnDevice)}>
          <Checkbox
            isSelected={rememberOnDevice}
            className="checkbox-sm pointer-events-none"
            tabIndex={-1}
            aria-hidden
          />
          Remember on this device
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
