import { Position, wktToGeoJSON } from "betterknown";
import L, { LatLngTuple } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import {
  SimplifiedSparqlValueGroup,
  simplifySparqlResults,
  SparqlValueRaw,
} from "wikibase-sdk";
import wdk from "wikibase-sdk/wikidata.org";

const position: LatLngTuple = [20.6752, -103.3473];

const GUADALAJARA_QUERY = `
SELECT DISTINCT
  ?item
  ?itemLabel
  ?coord
  ?enArticle
  ?esArticle
WHERE {
  # Guadalajara, Jalisco (the city)
  VALUES ?guadalajara { wd:Q9022 }

  # Items related to Guadalajara by location/affiliation
  {
    ?item wdt:P131|wdt:P276|wdt:P159|wdt:P19 ?guadalajara.
  }
  UNION
  # Related by topic/part-of/name
  {
    ?item wdt:P921|wdt:P1448|wdt:P361 ?guadalajara.
  }

  # Geographic coordinates
  ?item wdt:P625 ?coord.

  # English Wikipedia article (optional)
  OPTIONAL {
    ?enArticle schema:about ?item ;
               schema:inLanguage "en" ;
               schema:isPartOf <https://en.wikipedia.org/> .
  }

  # Spanish Wikipedia article (optional)
  OPTIONAL {
    ?esArticle schema:about ?item ;
               schema:inLanguage "es" ;
               schema:isPartOf <https://es.wikipedia.org/> .
  }

  # Only keep results with at least ONE of the two languages
  FILTER(BOUND(?enArticle) || BOUND(?esArticle))

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
ORDER BY ?itemLabel
LIMIT 200
`;

const GUADALAJARA_QUERY_2 = `
SELECT DISTINCT
  ?item
  (COALESCE(?itemLabelES, ?itemLabelEN) AS ?itemLabel)
  ?coord
  ?enArticle
  ?esArticle
WHERE {
  VALUES ?guadalajara { wd:Q9022 }    # Guadalajara, Jalisco

  # Must have coordinates
  ?item wdt:P625 ?coord .

  # Item is inside Guadalajara's administrative area
  ?item wdt:P131* ?guadalajara .

  # Get Spanish label if available
  OPTIONAL { ?item rdfs:label ?itemLabelES .
             FILTER(lang(?itemLabelES) = "es") }

  # Get English label if available
  OPTIONAL { ?item rdfs:label ?itemLabelEN .
             FILTER(lang(?itemLabelEN) = "en") }

  # English Wikipedia article (optional)
  OPTIONAL {
    ?enArticle schema:about ?item ;
               schema:inLanguage "en" ;
               schema:isPartOf <https://en.wikipedia.org/> .
  }

  # Spanish Wikipedia article (optional)
  OPTIONAL {
    ?esArticle schema:about ?item ;
               schema:inLanguage "es" ;
               schema:isPartOf <https://es.wikipedia.org/> .
  }

  # Keep only entities with at least one Wikipedia article
  FILTER(BOUND(?enArticle) || BOUND(?esArticle))
}
ORDER BY ?itemLabel

`;

type Place = {
  id: SparqlValueRaw;
  label: SparqlValueRaw;
  coord: readonly [number, number];
  esArticle: string | undefined;
  enArticle: string | undefined;
};

function expectPoint(x: ReturnType<typeof wktToGeoJSON>) {
  if (x?.type === "Point") {
    return x;
  } else {
    throw new Error("not a point! " + String(x));
  }
}

export function App() {
  const [count, setCount] = useState(0);
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [places, setPlaces] = useState(() => new Map<string, Place>());

  useEffect(() => {
    const mapDiv = mapDivRef.current;
    if (!mapDiv) {
      return;
    }

    const map = L.map(mapDiv).setView([51.505, -0.09], 13);
    return () => {
      map.off();
      map.remove();
    };
  }, []);

  return (
    <>
      <div className="flex flex-col" style={{ width: 200 }}>
        hello world
        <button
          onClick={() => {
            console.log(wktToGeoJSON(`POINT(-400004.3 60000.1)`));
            setCount((prev) => prev + 1);
          }}
        >
          testtt
        </button>
        <button
          onClick={async () => {
            const url = wdk.sparqlQuery(GUADALAJARA_QUERY_2);
            const response = await fetch(url); // required User-Agent set by the browser
            const result = simplifySparqlResults(await response.json()).map(
              ({ coord, esArticle, enArticle, item: { value, label } }) => {
                const coords = expectPoint(wktToGeoJSON(String(coord)))
                  .coordinates as [number, number];
                return [
                  String(value),
                  {
                    id: value,
                    label,
                    // for some reason this is fliped in the geojson format?
                    coord: [coords[1], coords[0]],
                    esArticle: esArticle as string | undefined,
                    enArticle: enArticle as string | undefined,
                  },
                ] as const;
              }
            );

            setPlaces(new Map(result));
            console.log("result", result);
          }}
        >
          hello click
        </button>
      </div>

      {/* <div id="map"></div> */}
      <div className="grow" style={{ minWidth: 200 }}>
        <MapContainer
          className="h-full"
          center={position}
          // scrollWheelZoom={false}
          zoom={11}
          minZoom={10}
          maxBoundsViscosity={0.8}
          maxBounds={[
            [20.82, -103.53],
            [20.41, -103.09],
          ]}
        >
          {[...places.entries()].map(([id, place]) => {
            console.log("HERE");
            return (
              <Marker key={id} position={place.coord as [number, number]}>
                <Popup>
                  {place.label}{" "}
                  {place.esArticle && (
                    <a href={place.esArticle} target="_blank" rel="noreferrer">
                      es
                    </a>
                  )}
                  {place.enArticle && (
                    <a href={place.enArticle} target="_blank" rel="noreferrer">
                      en
                    </a>
                  )}
                </Popup>
              </Marker>
            );
          })}
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      /> */}
          {/* <GeoJSON data={undefined} /> */}
        </MapContainer>
      </div>
    </>
  );
}
