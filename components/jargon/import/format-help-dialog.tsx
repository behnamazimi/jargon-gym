"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { CopyIconButton } from "@/components/jargon/import/copy-icon-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Format({
  title,
  children,
  example,
  copyLabel,
}: {
  title: string;
  children: ReactNode;
  example?: string;
  /** Adds a copy button to the example. */
  copyLabel?: string;
}) {
  return (
    <section className="space-y-1">
      <h3 className="m-0 text-sm font-semibold">{title}</h3>
      <p className="m-0 text-sm text-base-content/70">{children}</p>
      {example ? (
        <div className="relative">
          <pre className="m-0 rounded-lg bg-base-200/60 px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap">
            {example}
          </pre>
          {copyLabel ? (
            <div className="absolute top-1 right-1">
              <CopyIconButton value={example} label={copyLabel} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const linkClass = "link link-primary";

/** A "?" button that explains what the paste box accepts. */
export function FormatHelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="What formats can I paste?"
        className={`min-h-11 min-w-11 text-base-content/60 md:min-h-8 md:min-w-8 ${className ?? ""}`}
        onPress={() => setOpen(true)}
      >
        <CircleHelp className="size-5" aria-hidden strokeWidth={1.5} />
      </Button>
      <Dialog isOpen={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>What you can paste</DialogTitle>
          <DialogDescription>
            Only the term is required. Everything else is optional.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          <Format
            title="A list of terms and definitions"
            example="API – a way for programs to talk to each other"
          >
            One term per line, with a dash, colon, equals sign or tab before its definition.
          </Format>
          <Format title="Just words">
            One word per line. Each is saved as a term to finish later.
          </Format>
          <Format
            title="A spreadsheet or CSV"
            copyLabel="Copy CSV example"
            example={
              "Term,Definition,Example,Category\nAPI,A way for programs to talk,Call the API,Tech"
            }
          >
            Paste the cells or choose a CSV file. Use these header names: Term, Definition, Example,
            Note, Category. Only the first two columns are needed.
          </Format>
          <Format title="Exports from other apps">
            Quizlet and Anki exports work.{" "}
            <Link href="/jargon/import/apps" className={linkClass}>
              How to export
            </Link>
          </Format>
          <Format title="JSON">
            The only way to add other fields like mental model, in practice, anti-example, debated,
            links between terms, and the language all together in bulk.{" "}
            <Link href="/jargon/import/more" className={linkClass}>
              See the format
            </Link>
          </Format>
        </div>
      </Dialog>
    </>
  );
}
