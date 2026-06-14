import { simplifySparqlResults } from "wikibase-sdk";
import wdk from "wikibase-sdk/wikidata.org";
import { Entity, LayerKey } from "./historia";

// --- Cultural regions & countries -------------------------------------------
// Wikidata has no single predicate for "is Mesoamerican/Aridoamerican": the
// relevant items are only ever typed with generic classes (ethnic group,
// empire, archaeological site, …) and are *not* consistently linked to the
// region items. So each layer below approximates its set by combining a
// generic class with a geographic constraint (country in the region). QIDs
// were verified against the live endpoint.
export const MESOAMERICA = "Q13703"; // historical cultural region
export const ARIDOAMERICA = "Q613648"; // ecological/cultural region
export const OASISAMERICA = "Q2885121"; // pre-Columbian cultural region

// Modern countries that overlap the Mesoamerican / Aridoamerican area.
export const MEXICO = "Q96";
export const GUATEMALA = "Q774";
export const BELIZE = "Q242";
export const HONDURAS = "Q783";
export const EL_SALVADOR = "Q792";

const COUNTRIES = [MEXICO, GUATEMALA, BELIZE, HONDURAS, EL_SALVADOR];
const REGIONS = [MESOAMERICA, ARIDOAMERICA, OASISAMERICA];

const wd = (qids: string[]) => qids.map((q) => `wd:${q}`).join(" ");
const inList = (qids: string[]) => qids.map((q) => `wd:${q}`).join(", ");

// VALUES blocks, scoped *inside* the pattern that uses them. Declaring them at
// the top of the query instead cross-joins them onto branches that don't use
// the variable, multiplying intermediate rows and timing the query out.
const CTRY = `VALUES ?ctry { ${wd(COUNTRIES)} }`;
const REG = `VALUES ?reg { ${wd(REGIONS)} }`;

// Each selector is a graph pattern that binds ?item. buildQuery adds the shared
// date coalescing, instance-of labels and label service.
//
// Peoples: ethnic groups in the region (minus immigrant communities that
// declare a foreign country of origin), anything "indigenous to" a cultural
// region, archaeological cultures, and the small dedicated "Mesoamerican
// civilization" class.
//
// NOTE: we intentionally do *not* also exclude subclasses of "human migration"
// here. That extra `FILTER NOT EXISTS … wdt:P279*` runs a correlated subclass
// traversal per candidate and pushes the query past the 60s WDQS timeout while
// the service is degraded. The foreign-origin filter below removes most
// immigrant groups; the rest are undated and only ever show up in the list.
const PEOPLES_SELECTOR = `
  {
    ?item wdt:P31/wdt:P279* wd:Q41710 .
    ${CTRY} ?item wdt:P17 ?ctry .
    FILTER NOT EXISTS { ?item wdt:P495 ?oo . FILTER(?oo NOT IN (${inList(COUNTRIES)})) }
  }
  UNION { ${REG} ?item wdt:P2341 ?reg . }
  UNION { ?item wdt:P31/wdt:P279* wd:Q465299 . ${CTRY} ?item wdt:P17 ?ctry . }
  UNION { ?item wdt:P31 ?mc . ?mc rdfs:label "Mesoamerican civilization"@en . }
`;

// Nations & empires: empires, historical countries, kingdoms and city-states
// located in the region. (Includes a few post-conquest Mexican republics.)
const NATIONS_SELECTOR = `
  ?item wdt:P31/wdt:P279* ?ncls . VALUES ?ncls { wd:Q48349 wd:Q3024240 wd:Q417175 wd:Q133442 }
  ${CTRY} ?item wdt:P17 ?ctry .
`;

// Cities: archaeological sites and ancient cities in the region. (Plain
// "city" Q515 is excluded — it would pull in thousands of modern towns.)
const CITIES_SELECTOR = `
  ?item wdt:P31/wdt:P279* ?ccls . VALUES ?ccls { wd:Q839954 wd:Q15661340 }
  ${CTRY} ?item wdt:P17 ?ctry .
`;

export const SELECTORS: Record<LayerKey, string> = {
  peoples: PEOPLES_SELECTOR,
  nations: NATIONS_SELECTOR,
  cities: CITIES_SELECTOR,
};

// Dates are sparse and scattered, so we COALESCE inception (P571) / start time
// (P580) / earliest date (P1319) into a start, and dissolved (P576) / end time
// (P582) / latest date (P1326) into an end. Items with no resolvable start go
// in the list rather than the timeline.
function buildQuery(selector: string): string {
  return `
SELECT DISTINCT ?item ?itemLabel ?startDate ?endDate
  (GROUP_CONCAT(DISTINCT ?ioLabel; separator="$$") AS ?instanceOfLabels)
WHERE {
  ${selector}
  OPTIONAL { ?item wdt:P571 ?inception } OPTIONAL { ?item wdt:P580 ?st } OPTIONAL { ?item wdt:P1319 ?ear }
  OPTIONAL { ?item wdt:P576 ?dissolved } OPTIONAL { ?item wdt:P582 ?et } OPTIONAL { ?item wdt:P1326 ?lat }
  BIND(COALESCE(?inception, ?st, ?ear) AS ?startDate)
  BIND(COALESCE(?dissolved, ?et, ?lat) AS ?endDate)
  OPTIONAL { ?item wdt:P31 ?io . ?io rdfs:label ?ioLabel . FILTER(LANG(?ioLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". ?item rdfs:label ?itemLabel }
}
GROUP BY ?item ?itemLabel ?startDate ?endDate
`;
}

/** GET URL for a layer's SPARQL query against the Wikidata endpoint. */
export function sparqlUrl(layer: LayerKey): string {
  return wdk.sparqlQuery(buildQuery(SELECTORS[layer]));
}

// Wikidata times look like "-9050-01-01T00:00:00Z" or "1200-01-01T00:00:00Z".
// We only need the (possibly negative) year for a rudimentary timeline.
export function parseYear(iso: string | undefined): number | null {
  if (!iso) {
    return null;
  }
  const m = /^(-?)0*(\d+)-/.exec(iso);
  if (!m) {
    return null;
  }
  const year = parseInt(m[2], 10);
  return m[1] === "-" ? -year : year;
}

/** Turn a raw SPARQL JSON response into our flat Entity[] shape. */
export function entitiesFromSparql(json: unknown): Entity[] {
  const rows = simplifySparqlResults(
    json as Parameters<typeof simplifySparqlResults>[0]
  );
  return rows.map(
    ({ item: { value, label }, startDate, endDate, instanceOfLabels }) => ({
      id: String(value),
      label: String(label ?? value),
      start: parseYear(startDate as string | undefined),
      end: parseYear(endDate as string | undefined),
      instanceOf: String(instanceOfLabels ?? "")
        .split("$$")
        .filter((x) => x !== ""),
    })
  );
}
