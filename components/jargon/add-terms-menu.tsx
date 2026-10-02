"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type AddTermsMenuProps = {
  domainId: string;
  onAddTerm: () => void;
};

/** Add terms to this collection: one at a time, or a pasted list. */
export function AddTermsMenu({ domainId, onAddTerm }: AddTermsMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenuTrigger>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="min-h-11 min-w-11 text-base-content/70 hover:text-base-content md:min-h-8 md:min-w-8"
        aria-label="Add terms"
      >
        <Plus className="size-5" strokeWidth={1.5} />
      </Button>
      <DropdownMenu className="min-w-[180px]">
        <DropdownMenuItem onAction={onAddTerm}>One term</DropdownMenuItem>
        <DropdownMenuItem onAction={() => router.push(`/jargon/import/paste?to=${domainId}`)}>
          Paste a list
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
