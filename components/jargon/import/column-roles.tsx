"use client";

import type { ColumnRole, ParsedList } from "@/lib/jargon/import/parse/types";

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: "term", label: "Term" },
  { value: "definition", label: "Definition" },
  { value: "example", label: "Example" },
  { value: "note", label: "Note" },
  { value: "category", label: "Category" },
  { value: "ignore", label: "Ignore" },
];

type ColumnRolesProps = {
  parsed: ParsedList;
  onRolesChange: (roles: ColumnRole[]) => void;
};

/** What each column of a table is. Only for lists with three or more. */
export function ColumnRoles({ parsed, onRolesChange }: ColumnRolesProps) {
  const width = Math.max(parsed.roles.length, ...parsed.rows.map((row) => row.length));
  if (width < 3) return null;

  const roles = Array.from({ length: width }, (_, index) => parsed.roles[index] ?? "ignore");

  return (
    <fieldset className="m-0 space-y-2 border-0 p-0">
      <legend className="mb-1 text-sm font-medium">What each column is</legend>
      {roles.map((role, index) => {
        const label = parsed.heading?.[index] || parsed.rows[0]?.[index] || `Column ${index + 1}`;
        return (
          <label key={index} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <select
              className="select select-sm min-h-11 w-40 text-base md:min-h-8 md:text-sm"
              value={role}
              aria-label={`What column ${index + 1} is`}
              onChange={(event) => {
                const next = [...roles];
                next[index] = event.target.value as ColumnRole;
                onRolesChange(next);
              }}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </fieldset>
  );
}
