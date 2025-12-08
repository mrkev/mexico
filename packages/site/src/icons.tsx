import L from "leaflet";

function svgIcon(name: string) {
  return new L.Icon({
    iconUrl: `./${name}.svg`,
    iconRetinaUrl: `./${name}.svg`,
    iconSize: new L.Point(20, 20),
    className: "leaflet-div-icon",
  });
}

const icon = {
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
function any(set: Set<string>, ...strs: string[]) {
  for (const str of strs) {
    if (set.has(str)) {
      return true;
    }
  }
  return false;
}
export function iconFor(set: Set<string>) {
  if (any(set, "railway station", "tram stop")) {
    return icon.station;
  } else if (any(set, "museum", "palace")) {
    return icon.museum;
  } else if (any(set, "park", "urban park")) {
    return icon.trees;
  } else if (any(set, "market")) {
    return icon.store;
  } else if (any(set, "monument", "sculpture", "statue")) {
    return icon.monument;
  } else if (any(set, "library")) {
    return icon.books;
  } else if (any(set, "sports season")) {
    return icon.event;
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
    return icon.school;
  } else if (any(set, "radio station")) {
    return icon.radioTower;
  } else if (
    any(
      set,
      "temple",
      "church building",
      "religious building",
      "minor basilica"
    )
  ) {
    return icon.temple;
  } else if (any(set, "disaster", "conflagration", "structure fire")) {
    return icon.disaster;
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
    return icon.stadium;
  } else if (any(set, "archaeological site")) {
    return icon.amphora;
  } else if (any(set, "bus station")) {
    return icon.bus;
  } else {
    return icon.place;
  }
}
