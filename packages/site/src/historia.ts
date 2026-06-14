// Shared, dependency-free types + display helpers for the Historia timeline.
// The actual Wikidata queries live in historia.sparql.ts and are run offline
// by scripts/fetch-historia.ts; the client only reads the cached src/data/*.json.

export type LayerKey = "peoples" | "nations" | "cities";

export const LAYERS: { key: LayerKey; label: string }[] = [
  { key: "peoples", label: "Peoples" },
  { key: "nations", label: "Nations & empires" },
  { key: "cities", label: "Cities" },
];

export type Entity = {
  id: string;
  label: string;
  /** Year as a number; negative = BCE. null when Wikidata has no date. */
  start: number | null;
  end: number | null;
  instanceOf: string[];
};

/** "650 CE" / "1200 BCE" for axis + row labels. */
export function formatYear(year: number): string {
  return year < 0 ? `${-year} BCE` : `${year} CE`;
}
