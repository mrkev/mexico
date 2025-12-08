import { wktToGeoJSON } from "betterknown";
import L, { LatLngTuple, svg } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { simplifySparqlResults, SparqlValueRaw } from "wikibase-sdk";
import wdk from "wikibase-sdk/wikidata.org";

const position: LatLngTuple = [20.6752, -103.3473];

const GUADALAJARA = "Q9022";
const ZAPOPAN = "Q147402";
const TLAQUEPAQUE = "Q155277";
const TONALA = "Q2677554";
const TLAJOMULCO = "Q20249211";

// Source - https://stackoverflow.com/a
// Posted by arnaudambro, modified by community. See post 'Timeline' for change history
// Retrieved 2025-12-08, License - CC BY-SA 4.0

function svgIcon(name: string) {
  return new L.Icon({
    iconUrl: `/${name}.svg`,
    iconRetinaUrl: `/${name}.svg`,
    iconSize: new L.Point(20, 20),
    className: "leaflet-div-icon",
  });
}

const iconStore = svgIcon("store");
const iconMuseum = svgIcon("landmark");
const iconTrees = svgIcon("trees");
const iconPlace = svgIcon("map-pin");
const iconStation = svgIcon("train-fill");
const iconMonument = svgIcon("arch");
const templeMonument = svgIcon("church");
const iconDisaster = svgIcon("message-exclamation");
const iconStadium = svgIcon("stadium");
const iconBooks = svgIcon("book-copy");
const iconEvent = svgIcon("calendar-star");
const iconSchool = svgIcon("graduation-cap");
const iconRadioTower = svgIcon("radio-tower");

const icon = {
  amphora: svgIcon("amphora"),
  bus: svgIcon("bus"),
};

function any(set: Set<string>, ...strs: string[]) {
  for (const str of strs) {
    if (set.has(str)) {
      return true;
    }
  }
  return false;
}

function iconFor(set: Set<string>) {
  if (any(set, "railway station", "tram stop")) {
    return iconStation;
  } else if (any(set, "museum", "palace")) {
    return iconMuseum;
  } else if (any(set, "park", "urban park")) {
    return iconTrees;
  } else if (set.has("market")) {
    return iconStore;
  } else if (any(set, "monument", "sculpture", "statue")) {
    return iconMonument;
  } else if (any(set, "library")) {
    return iconBooks;
  } else if (any(set, "sports season")) {
    return iconEvent;
  } else if (
    any(
      set,
      "university",
      "Catholic university",
      "Jesuit university",
      "academic department",
      "academic institution",
      "public university"
    )
  ) {
    return iconSchool;
  } else if (any(set, "radio station")) {
    return iconRadioTower;
  } else if (
    any(
      set,
      "temple",
      "church building",
      "religious building",
      "minor basilica"
    )
  ) {
    return templeMonument;
  } else if (any(set, "disaster", "conflagration", "structure fire")) {
    return iconDisaster;
  } else if (
    any(
      set,
      "stadium",
      "association football venue",
      "bullring",
      "first class bullring",
      "sports venue",
      "arena"
    )
  ) {
    return iconStadium;
  } else if (any(set, "archaeological site")) {
    return icon.amphora;
  } else if (any(set, "bus station")) {
    return icon.bus;
  }

  return iconPlace;
}

const CITY_ADMIN_QUERY = (cityid: string) => `
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

const queryAll = async (places: string[]) => {
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

type Place = {
  id: SparqlValueRaw;
  label: SparqlValueRaw;
  instanceOf: Set<string>;
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
            const result = await queryAll([
              GUADALAJARA,
              TLAQUEPAQUE,
              ZAPOPAN,
              TONALA,
              // TLAJOMULCO,
            ]);
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
            return (
              <Marker
                key={id}
                position={place.coord as [number, number]}
                icon={iconFor(place.instanceOf)}
              >
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
                  {window.location.hostname === "localhost" && (
                    <>
                      <button
                        onClick={() => console.log(place, place.instanceOf)}
                      >
                        debug
                      </button>
                      <a
                        href={`https://www.wikidata.org/wiki/${id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        data
                      </a>
                    </>
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
