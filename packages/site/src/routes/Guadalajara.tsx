import { mSet, useLink } from "@mrkev/marked-subbable";
import L, { LatLngTuple } from "leaflet";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Button } from "../components/ui/button";
import { ButtonGroup } from "../components/ui/button-group";
import { Toggle } from "../components/ui/toggle";
import { iconFor, markers } from "../icons";
import {
  GUADALAJARA,
  Place,
  queryAll,
  TLAQUEPAQUE,
  TONALA,
  ZAPOPAN,
  ZAPOPAN2,
} from "../wikidata";

const position: LatLngTuple = [20.6752, -103.3473];

const state = { selected: mSet<string>(Object.keys(markers)) };

export function Guadalajara() {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const [places, setPlaces] = useState(() => new Map<string, Place>());
  const sel = useLink(state.selected);

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
      <div className="flex flex-col px-2 py-1 gap-6" style={{ width: 300 }}>
        Wiki-Guadalajara
        <ButtonGroup
          orientation="vertical"
          aria-label="Media controls"
          className="h-fit"
        >
          {Object.entries(markers).map(([id, marker]) => {
            return (
              <Toggle
                className="justify-start cursor-pointer"
                key={id}
                pressed={sel().has(id)}
                onPressedChange={(pressed) => {
                  if (!pressed) {
                    sel().delete(id);
                  } else {
                    sel().add(id);
                  }
                }}
                variant="outline"
                size="sm"
              >
                <img
                  className="bg-white border border-gray-500"
                  src={marker.icon.options.iconRetinaUrl}
                  width={marker.icon.options.iconSize.x}
                  height={marker.icon.options.iconSize.y}
                ></img>{" "}
                {id}
              </Toggle>
            );
          })}

          <Toggle
            pressed={sel().has("events")}
            onPressedChange={(pressed) => {
              if (!pressed) {
                sel().delete("events");
              } else {
                sel().add("events");
              }
            }}
            variant="outline"
            size="sm"
          >
            <PlusIcon /> Events, disasters, etc
          </Toggle>
          <Toggle variant="outline" size="sm">
            <MinusIcon /> Show That
          </Toggle>
        </ButtonGroup>
        <Button
          onClick={async () => {
            const result = await queryAll([
              GUADALAJARA,
              TLAQUEPAQUE,
              ZAPOPAN,
              ZAPOPAN2,
              TONALA,
              // TLAJOMULCO,
            ]);
            setPlaces(new Map(result));
            console.log("result", result);
          }}
        >
          hello click
        </Button>
      </div>

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
                  <div className="flex flex-row gap-1 items-center">
                    <b>{place.label}</b>
                    {place.esArticle && (
                      <a
                        href={place.esArticle}
                        target="_blank"
                        rel="noreferrer"
                      >
                        es
                      </a>
                    )}
                    {place.esArticle && place.enArticle && (
                      <div className="border-l border-gray-600 h-4 relative top-0.5"></div>
                    )}
                    {place.enArticle && (
                      <a
                        href={place.enArticle}
                        target="_blank"
                        rel="noreferrer"
                      >
                        en
                      </a>
                    )}
                  </div>

                  {window.location.hostname === "localhost" && (
                    <div>
                      <a
                        href="#"
                        onClick={() => console.log(place, place.instanceOf)}
                      >
                        debug
                      </a>
                      <a
                        href={`https://www.wikidata.org/wiki/${id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        data
                      </a>
                    </div>
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
