"use client";

import { FileText, Clipboard } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormatHelpButton } from "@/components/jargon/import/format-help-dialog";
import { ImportFailurePanel } from "@/components/jargon/import/import-errors";
import { decodeFileBytes } from "@/lib/jargon/import/parse/decode";
import type { PasteProblem } from "@/lib/jargon/import/read-input";

const PLACEHOLDER =
  "Put each term on its own line, with a dash or colon before its definition.\n\nFor example:\nAPI – a way for programs to talk to each other";

type PasteStepProps = {
  draft: string;
  problem: PasteProblem | null;
  onTextChange: (text: string) => void;
  /** Reads the text and moves on to Check. */
  onCheck: (text: string, html?: string) => void;
  onTreatAsText: () => void;
  onProblem: (message: string) => void;
};

export function PasteStep({
  draft,
  problem,
  onTextChange,
  onCheck,
  onTreatAsText,
  onProblem,
}: PasteStepProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteBlocked, setPasteBlocked] = useState(false);

  function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const plain = event.clipboardData.getData("text/plain");
    const html = event.clipboardData.getData("text/html");
    if (!plain && !html) return;
    event.preventDefault();

    const target = event.currentTarget;
    const next = plain
      ? draft.slice(0, target.selectionStart) + plain + draft.slice(target.selectionEnd)
      : draft;
    onTextChange(next);
    onCheck(next, /<table[\s>]/i.test(html) ? html : undefined);
  }

  async function handlePasteButton() {
    setPasteBlocked(false);
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        textareaRef.current?.focus();
        return;
      }
      onTextChange(text);
      onCheck(text);
    } catch {
      setPasteBlocked(true);
      textareaRef.current?.focus();
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const decoded = decodeFileBytes(new Uint8Array(await file.arrayBuffer()));
    if (decoded.kind === "package") {
      onProblem(
        "That file looks like a package from Anki or a spreadsheet app. Export it as text or CSV, or copy the cells and paste them here.",
      );
      return;
    }
    if (!decoded.text.trim()) {
      onProblem(`"${file.name}" is empty.`);
      return;
    }
    onTextChange(decoded.text);
    onCheck(decoded.text);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={draft}
          aria-label="Your list"
          placeholder={PLACEHOLDER}
          className="min-h-64 pr-12 text-base leading-relaxed"
          onChange={(event) => onTextChange(event.target.value)}
          onPaste={handlePaste}
        />
        <FormatHelpButton className="absolute top-1 right-1" />
      </div>

      {draft.trim() ? (
        <Button type="button" className="min-h-11 w-full" onPress={() => onCheck(draft)}>
          Check your list
        </Button>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onPress={() => void handlePasteButton()}
        >
          <Clipboard className="size-4" aria-hidden strokeWidth={1.5} />
          Paste
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onPress={() => fileRef.current?.click()}
        >
          <FileText className="size-4" aria-hidden strokeWidth={1.5} />
          Choose a file
        </Button>
        {/* No accept filter: iOS greys out files it doesn't recognise. */}
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a file"
          onChange={(event) => void handleFile(event)}
        />
      </div>

      {pasteBlocked ? (
        <p className="m-0 text-sm text-base-content/60" role="status">
          Paste isn&apos;t available here. Tap the box and choose Paste.
        </p>
      ) : null}

      {problem?.failure ? <ImportFailurePanel failure={problem.failure} /> : null}
      {problem && !problem.failure ? (
        <Alert variant="destructive">
          <AlertDescription>{problem.message}</AlertDescription>
          {problem.canTreatAsText ? (
            <AlertAction>
              <Button type="button" size="sm" variant="outline" onPress={onTreatAsText}>
                Treat it as a list
              </Button>
            </AlertAction>
          ) : null}
        </Alert>
      ) : null}

      <p className="m-0 text-sm text-base-content/60">
        Works with lists from Notes, Google Sheets, Excel, Docs and WhatsApp, and with exports from
        Quizlet and Anki.
      </p>

      <div className="flex justify-center">
        <LinkButton
          href="/jargon/import/more"
          variant="ghost"
          size="sm"
          className="min-h-11 text-base-content/60"
        >
          More import options
        </LinkButton>
      </div>
    </div>
  );
}
