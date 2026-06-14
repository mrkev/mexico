import L from "leaflet";
import { any } from "./set";

function svgIcon(name: string) {
  return new L.Icon({
    iconUrl: `./${name}.svg`,
    iconRetinaUrl: `./${name}.svg`,
    iconSize: new L.Point(20, 20),
    className: "leaflet-div-icon",
  });
}

// lucide, boxicons and remixicon
export const icon = {
  amphora: svgIcon("amphora"),
  bus: svgIcon("bus"),
  temple: svgIcon("church"),
  disaster: svgIcon("message-exclamation"),
  stadium: svgIcon("stadium"),
  books: svgIcon("book-copy"),
  event: svgIcon("calendar-star"),
  school: svgIcon("graduation-cap"),
  radioTower: svgIcon("radio-tower"),
  store: svgIcon("store"),
  museum: svgIcon("landmark"),
  trees: svgIcon("trees"),
  place: svgIcon("map-pin"),
  station: svgIcon("train-fill"),
  monument: svgIcon("arch"),
};

export function iconFor(set: Set<string>) {
  for (const [_, marker] of Object.entries(markers)) {
    if (any(set, ...marker.instances)) {
      return marker.icon;
    }
  }
  return icon.place;
}

export const markers = {
  disaster: {
    name: "Disasters",
    icon: icon.disaster,
    instances: ["disaster", "conflagration", "structure fire"],
  },
  temple: {
    name: "Churches",
    icon: icon.temple,
    instances: [
      "temple",
      "church building",
      "religious building",
      "minor basilica",
    ],
  },
  stadium: {
    name: "Stadiums",
    icon: icon.stadium,
    instances: [
      "stadium",
      "association football venue",
      "bullring",
      "first class bullring",
      "sports venue",
      "arena",
      "velodrome",
    ],
  },
  event: {
    name: "Events",
    icon: svgIcon("calendar-star"),
    instances: ["sports season"],
  },
  school: {
    name: "Schools",
    icon: icon.school,
    instances: [
      "university",
      "Catholic university",
      "Jesuit university",
      "academic department",
      "academic institution",
      "public university",
    ],
  },
  trainStation: {
    instances: ["railway station", "tram stop"],
    icon: icon.station,
  },
  museum: { instances: ["museum", "palace"], icon: icon.museum },
  park: { instances: ["park", "urban park"], icon: icon.trees },
  market: { instances: ["market"], icon: icon.store },
  monument: {
    instances: ["monument", "sculpture", "statue"],
    icon: icon.monument,
  },
  library: { instances: ["library"], icon: icon.books },
  radioStation: { instances: ["radio station"], icon: icon.radioTower },
  archaeologicalSite: {
    instances: ["archaeological site"],
    icon: icon.amphora,
  },
  busStation: { instances: ["bus station"], icon: icon.bus },
};

export const categoryOfInstance = new Map(
  Object.entries(markers)
    .map(([category, marker]) => {
      return marker.instances.map((instance) => [instance, category] as const);
    })
    .flat()
);
