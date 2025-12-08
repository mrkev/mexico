import { useEffect, useRef, useState } from "react";
import L, { LatLngTuple } from "leaflet";
import { GeoJSON, MapContainer, TileLayer } from "react-leaflet";

const position: LatLngTuple = [21.52694133828857, -101.3454508286864];

export function App() {
  const [count, setCount] = useState(0);
  const mapDivRef = useRef<HTMLDivElement | null>(null);

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
      <div
        style={{
          width: 200,
        }}
      >
        hello world
      </div>
      {/* <div id="map"></div> */}
      <div
        style={{
          minWidth: 200,
          flexGrow: 1,
        }}
      >
        <MapContainer
          center={position}
          zoom={5}
          scrollWheelZoom={false}
          style={{ height: "100vh" }}
        >
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
