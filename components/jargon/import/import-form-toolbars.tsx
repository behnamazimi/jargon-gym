import { Ellipsis, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImportToolbar } from "@/components/jargon/import/import-ui";

type ImportFormToolbarProps = {
  hasContent: boolean;
  onApplyTemplate: (template: "sample" | "minimal") => void;
  onFormat: () => void;
  onClear: () => void;
  onUploadClick: () => void;
};

export function ImportFormMobileToolbar({
  hasContent,
  onApplyTemplate,
  onFormat,
  onClear,
  onUploadClick,
}: ImportFormToolbarProps) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 flex-1"
        onPress={onUploadClick}
      >
        <FileUp className="size-3.5" aria-hidden strokeWidth={1.5} />
        Upload .json
      </Button>
      <DropdownMenuTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="btn-square min-h-11 min-w-11"
          aria-label="More import tools"
        >
          <Ellipsis className="size-4" aria-hidden strokeWidth={1.5} />
        </Button>
        <DropdownMenu className="min-w-[160px]">
          <DropdownMenuItem onAction={() => onApplyTemplate("sample")}>
            Load example
          </DropdownMenuItem>
          <DropdownMenuItem onAction={() => onApplyTemplate("minimal")}>
            Load minimal
          </DropdownMenuItem>
          <DropdownMenuItem isDisabled={!hasContent} onAction={onFormat}>
            Format JSON
          </DropdownMenuItem>
          <DropdownMenuItem isDisabled={!hasContent} onAction={onClear}>
            Clear
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
    </div>
  );
}

export function ImportFormDesktopToolbar({
  hasContent,
  onApplyTemplate,
  onFormat,
  onClear,
  onUploadClick,
  lineCount,
}: ImportFormToolbarProps & { lineCount: number }) {
  return (
    <div className="hidden items-center justify-between gap-2 md:flex">
      <ImportToolbar>
        <Button type="button" variant="outline" size="sm" onPress={() => onApplyTemplate("sample")}>
          Load example
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={() => onApplyTemplate("minimal")}
        >
          Load minimal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={onFormat}
          isDisabled={!hasContent}
        >
          Format JSON
        </Button>
        <Button type="button" variant="outline" size="sm" onPress={onUploadClick}>
          <FileUp className="size-3.5" aria-hidden strokeWidth={1.5} />
          Upload .json
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onPress={onClear}
          isDisabled={!hasContent}
        >
          Clear
        </Button>
      </ImportToolbar>
      <span className="shrink-0 text-xs tabular-nums text-base-content/60">
        {hasContent ? `${lineCount} lines` : "No content yet"}
      </span>
    </div>
  );
}
