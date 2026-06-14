import { wktToGeoJSON } from "betterknown";
import { simplifySparqlResults, SparqlValueRaw } from "wikibase-sdk";
import wdk from "wikibase-sdk/wikidata.org";

export const GUADALAJARA = "Q9022";
export const ZAPOPAN = "Q147402";
export const ZAPOPAN2 = "Q2143868";
export const TLAQUEPAQUE = "Q155277";
export const TONALA = "Q2677554";
export const TLAJOMULCO = "Q20249211";

export const CITY_ADMIN_QUERY = (cityid: string) => `
SELECT DISTINCT 
  ?item 
  ?itemLabel 
  (GROUP_CONCAT(DISTINCT ?instanceOfLabel; separator="$$") AS ?instanceOfLabels)
  ?coord 
  ?enArticle 
  ?esArticle
WHERE {
  VALUES ?city { wd:${cityid} }
  
  ?item wdt:P625 ?coord ;
        wdt:P131* ?city .
  
  OPTIONAL {
    ?enArticle schema:about ?item ;
               schema:inLanguage "en" ;
               schema:isPartOf <https://en.wikipedia.org/> .
  }
  OPTIONAL {
    ?esArticle schema:about ?item ;
               schema:inLanguage "es" ;
               schema:isPartOf <https://es.wikipedia.org/> .
  }
  
  FILTER(BOUND(?enArticle) || BOUND(?esArticle))
  
  OPTIONAL { 
    ?item wdt:P31 ?instanceOf .
    ?instanceOf rdfs:label ?instanceOfLabel .
    FILTER(LANG(?instanceOfLabel) = "en")
  }
  
  SERVICE wikibase:label { 
    bd:serviceParam wikibase:language "es,en" . 
    ?item rdfs:label ?itemLabel .
  }
}
GROUP BY ?item ?itemLabel ?coord ?enArticle ?esArticle
ORDER BY ?itemLabel
`;
export const queryAll = async (places: string[]) => {
  const results = await Promise.all(
    places.map(async (place) => {
      const url = wdk.sparqlQuery(CITY_ADMIN_QUERY(place));
      const response = await fetch(url); // required User-Agent set by the browser
      const entries = simplifySparqlResults(await response.json()).map(
        ({
          coord,
          instanceOfLabels,
          esArticle,
          enArticle,
          item: { value, label },
        }) => {
          const coords = expectPoint(wktToGeoJSON(String(coord)))
            .coordinates as [number, number];
          return [
            String(value),
            {
              id: value,
              label,
              instanceOf: new Set(
                String(instanceOfLabels)
                  .split("$$")
                  .filter((x) => x !== "")
              ),
              // for some reason this is fliped in the geojson format?
              coord: [coords[1], coords[0]],
              esArticle: esArticle as string | undefined,
              enArticle: enArticle as string | undefined,
            },
          ] as const;
        }
      );
      return entries;
    })
  );

  return new Map(results.flat());
};
export type Place = {
  id: SparqlValueRaw;
  label: SparqlValueRaw;
  instanceOf: Set<string>;
  coord: readonly [number, number];
  esArticle: string | undefined;
  enArticle: string | undefined;
};

export function expectPoint(x: ReturnType<typeof wktToGeoJSON>) {
  if (x?.type === "Point") {
    return x;
  } else {
    throw new Error("not a point! " + String(x));
  }
}
