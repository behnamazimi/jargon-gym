import type { Database } from "@/lib/supabase/database.types";
import type { Domain, Term } from "./types";

type DomainRow = Database["public"]["Tables"]["domains"]["Row"];
type TermRow = Database["public"]["Tables"]["terms"]["Row"];

export function mapDomain(row: Pick<DomainRow, "id" | "name" | "icon_url">): Domain {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? "",
  };
}

export function mapTerm(row: TermRow): Term {
  return {
    id: row.id,
    term: row.term,
    category: row.category,
    definition: row.definition,
    example: row.example ?? "",
    discussion: row.discussion ?? "",
    controversy: row.controversy ?? undefined,
  };
}
