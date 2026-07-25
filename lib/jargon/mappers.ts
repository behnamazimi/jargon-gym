import type { Database } from "@/lib/supabase/database.types";
import type { Domain, DomainSource, Term } from "./types";

type DomainRow = Database["public"]["Tables"]["domains"]["Row"];
type TermRow = Database["public"]["Tables"]["terms"]["Row"];

type MapDomainOptions = {
  source: DomainSource;
  isActiveForReview: boolean;
  termCount?: number;
  knownCount?: number;
};

export function mapDomain(
  row: Pick<DomainRow, "id" | "name" | "icon_url" | "visibility" | "description">,
  options: MapDomainOptions,
): Domain {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? "",
    description: row.description ?? "",
    visibility: row.visibility,
    source: options.source,
    isActiveForReview: options.isActiveForReview,
    termCount: options.termCount ?? 0,
    knownCount: options.knownCount ?? 0,
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
