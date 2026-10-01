"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function Format({
  title,
  children,
  example,
}: {
  title: string;
  children: ReactNode;
  example?: string;
}) {
  return (
    <section className="space-y-1">
      <h3 className="m-0 text-sm font-semibold">{title}</h3>
      <p className="m-0 text-sm text-base-content/70">{children}</p>
      {example ? (
        <pre className="m-0 rounded-lg bg-base-200/60 px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap">
          {example}
        </pre>
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
            title="A list, one term per line"
            example="API – a way for programs to talk to each other"
          >
            Put a dash, colon, equals sign or tab between the term and its definition. We split at
            the first one, so later colons stay in the definition. Bullets, numbers and checkboxes
            are ignored.
          </Format>
          <Format title="Just words">
            One word per line. Each is saved as a term to finish later, and stays out of study until
            it has a definition.
          </Format>
          <Format
            title="Alternating lines"
            example={
              "API\nA way for programs to talk to each other\nSLA\nA promise about the level of service"
            }
          >
            No separator at all: a short term line (up to 40 characters), then a longer definition
            line, repeated. Needs an even number of lines. If your list has a dash or colon, use
            that instead; it&apos;s more reliable.
          </Format>
          <Format
            title="A spreadsheet or CSV"
            example={
              "Term,Definition,Example,Category\nAPI,A way for programs to talk to each other,The app calls the API,Tech"
            }
          >
            Copy the cells from Sheets, Excel, Numbers or a Docs table and paste them, or choose a
            CSV or TSV file (commas, semicolons or tabs). Two columns are the term and its
            definition. With three or more you choose what each column is on the next screen. A
            header row is recognised only when every cell in it is one of these words:
            <span className="mt-1 block">
              <b>Term:</b> term, word, front, question, woord, begrip, vraag
              <br />
              <b>Definition:</b> definition, meaning, translation, back, answer, betekenis,
              vertaling, antwoord
              <br />
              <b>Example:</b> example, voorbeeld
              <br />
              <b>Note:</b> note, notes, notitie, notities
              <br />
              <b>Category:</b> category, categorie, tag, tags, deck
            </span>
            <span className="mt-1 block">
              Any other header word and the first row is read as a term, so rename it or pick the
              columns yourself. With no header, the first two columns are used.
            </span>
          </Format>
          <Format title="Exports from other apps">
            Quizlet exports (with the usual separators, or your own like <code>##</code>) and
            Anki&apos;s &ldquo;Notes in Plain Text&rdquo;.{" "}
            <Link href="/jargon/import/apps" className={linkClass}>
              Where do I find the export?
            </Link>
          </Format>
          <Format title="JSON">
            Also works here. It&apos;s the only way to set mental model, in practice, anti-example
            and debated, to link terms to each other, and to set the collection&apos;s language.{" "}
            <Link href="/jargon/import/more" className={linkClass}>
              See the JSON format
            </Link>
          </Format>
          <p className="m-0 text-xs text-base-content/60">
            Up to 500 terms at a time. Terms already in the collection are skipped unless you choose
            to update them.
          </p>
        </div>
      </Dialog>
    </>
  );
}
