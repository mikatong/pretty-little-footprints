import type { MapIconType, MapPoint, Place } from "./types";
import { resolvePlaceIconKey } from "./iconTaxonomy";

export type PlaceAccent = {
  key: string;
  primary: string;
  dark: string;
  pale: string;
};

const accents: Record<string, PlaceAccent> = {
  beijing: { key: "beijing", primary: "#A34F3F", dark: "#6D332B", pale: "#E9C8BE" },
  chengdu: { key: "chengdu", primary: "#6F8B63", dark: "#3E6048", pale: "#D5E3D1" },
  taiyuan: { key: "taiyuan", primary: "#A06D48", dark: "#68422D", pale: "#E6CDB8" },
  tokyo: { key: "tokyo", primary: "#B45D4D", dark: "#743A32", pale: "#EAC7C1" },
  seoul: { key: "seoul", primary: "#76619B", dark: "#4E3F6D", pale: "#D8CEE8" },
  patagonia: { key: "patagonia", primary: "#7A5A99", dark: "#4F3D68", pale: "#D9CDE7" },
  canggu: { key: "canggu", primary: "#5F8A69", dark: "#3E6048", pale: "#CFE0D1" },
  antarctica: { key: "antarctica", primary: "#5E8EAA", dark: "#3D657A", pale: "#D6E5ED" },
  iceland: { key: "iceland", primary: "#6B92B2", dark: "#405F78", pale: "#D5E2EC" },
  bigSur: { key: "big-sur", primary: "#537B5C", dark: "#35513C", pale: "#CADACC" },
  peru: { key: "peru", primary: "#9B8650", dark: "#6A5B37", pale: "#E2D8B6" },
  annArbor: { key: "ann-arbor", primary: "#B18A48", dark: "#74582F", pale: "#E9D9B8" },
  waterloo: { key: "waterloo", primary: "#477E82", dark: "#2F595D", pale: "#C8DEDF" },
  mountainView: { key: "mountain-view", primary: "#718B73", dark: "#475E49", pale: "#D4E0D2" },
  hawaii: { key: "hawaii", primary: "#568D7A", dark: "#386354", pale: "#CCE1D9" },
  academic: { key: "academic", primary: "#6D7F99", dark: "#46566E", pale: "#D4DAE4" },
  asia: { key: "asia", primary: "#6F9277", dark: "#3E6048", pale: "#CFE0D1" },
  europe: { key: "europe", primary: "#8D624C", dark: "#5B3C31", pale: "#E7DED2" },
  northAmerica: { key: "north-america", primary: "#7F9FB2", dark: "#405F78", pale: "#D5E2EC" },
  southwest: { key: "southwest", primary: "#B47A43", dark: "#7A4B2B", pale: "#EAD1B4" },
  tropical: { key: "tropical", primary: "#5F8A69", dark: "#3E6048", pale: "#CFE0D1" },
  forest: { key: "forest", primary: "#537B5C", dark: "#35513C", pale: "#CADACC" },
  default: { key: "default", primary: "#8D624C", dark: "#5B3C31", pale: "#E7DED2" },
};

const textFor = (place: Place, point?: MapPoint | Place) => {
  return `${place.id} ${place.name} ${place.country} ${point?.id ?? ""} ${point?.name ?? ""} ${point?.country ?? ""}`.toLowerCase();
};

export const getPlaceAccent = (place: Place, point?: MapPoint | Place): PlaceAccent => {
  const text = textFor(place, point);
  if (/beijing|forbidden|palace/.test(text)) return accents.beijing;
  if (/chengdu/.test(text)) return accents.chengdu;
  if (/taiyuan/.test(text)) return accents.taiyuan;
  if (/tokyo/.test(text)) return accents.tokyo;
  if (/seoul/.test(text)) return accents.seoul;
  if (/patagonia|punta-arenas|puerto-natales|fitz/.test(text)) return accents.patagonia;
  if (/canggu/.test(text)) return accents.canggu;
  if (/antarctica/.test(text)) return accents.antarctica;
  if (/iceland|glacier|snow/.test(text)) return accents.iceland;
  if (/big-sur|redwood|cypress/.test(text)) return accents.bigSur;
  if (/peru|machu|cusco|lima|andes|aguas-calientes|maldonado|amazon/.test(text)) return accents.peru;
  if (/ann-arbor/.test(text)) return accents.annArbor;
  if (/waterloo/.test(text)) return accents.waterloo;
  if (/mountain-view|stanford/.test(text)) return accents.mountainView;
  if (/hawaii|honolulu|maui|big-island/.test(text)) return accents.hawaii;
  if (/university|campus/.test(text)) return accents.academic;
  if (/arizona|sedona|phoenix|grand-canyon|page|las-vegas|palm-springs|joshua|desert|southwest/.test(text)) return accents.southwest;
  if (/canggu|ubud|bali|hawaii|honolulu|maui|island|cancun|punta-cana|los-cabos/.test(text)) return accents.tropical;
  if (/vancouver|banff|algonquin|yosemite|tahoe|forest|carmel|point-lobos|mount/.test(text)) return accents.forest;
  if (/china|japan|tokyo|seoul|hong-kong|shanghai|taiyuan|chengdu|dali|wuhan|xiamen/.test(text)) return accents.asia;
  if (/france|paris|london|uk|edinburgh|york|europe/.test(text)) return accents.europe;
  if (/united states|canada|toronto|chicago|seattle|san-francisco|los-angeles|new-york|boston|miami/.test(text)) {
    return accents.northAmerica;
  }
  return accents.default;
};

export const getPlaceIconType = (place: Place, point?: MapPoint | Place): MapIconType => {
  return resolvePlaceIconKey(place, point);
};
