"use client";

import { useState } from "react";
import { IMPORT_RULES, IMPORT_SCHEMA_SECTIONS } from "@/lib/jargon/import/schema-reference";

export function ImportSchemaReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-medium"
      >
        <span>Schema reference</span>
        <span className="text-muted">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-4">
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted">
            {IMPORT_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>

          {IMPORT_SCHEMA_SECTIONS.map((section) => (
            <section key={section.title}>
              <h3 className="m-0 text-[14px] font-semibold">{section.title}</h3>
              <p className="mt-1 text-[13px] text-muted">{section.description}</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-muted">
                      <th className="py-1.5 pr-3 font-medium">Field</th>
                      <th className="py-1.5 pr-3 font-medium">Type</th>
                      <th className="py-1.5 pr-3 font-medium">Required</th>
                      <th className="py-1.5 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.fields.map((field) => (
                      <tr key={field.name} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-3 font-mono">{field.name}</td>
                        <td className="py-2 pr-3 text-muted">{field.type}</td>
                        <td className="py-2 pr-3">{field.required ? "Yes" : "No"}</td>
                        <td className="py-2">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
