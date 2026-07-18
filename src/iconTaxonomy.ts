import type { MapIconType, MapPoint, Place } from "./types";

/**
 * Editorial landmark taxonomy shared by the map and timeline glyphs.  The
 * shapes themselves live in the two SVG renderers; this module is deliberately
 * only about consistent destination-to-icon assignment.
 */
export const resolvePlaceIconKey = (place: Place, point?: MapPoint | Place): MapIconType => {
  if (place.mapIconType) return place.mapIconType;
  const text = `${place.id} ${place.name} ${place.country} ${point?.id ?? ""} ${point?.name ?? ""}`.toLowerCase();
  if (/beijing|forbidden/.test(text)) return "beijing";
  if (/chengdu/.test(text)) return "chengdu";
  if (/taiyuan/.test(text)) return "pagoda";
  if (/shanghai/.test(text)) return "shanghai";
  if (/tokyo/.test(text)) return "tokyo";
  if (/seoul/.test(text)) return "seoul";
  if (/san-francisco|palo-alto|bay-area/.test(text)) return "bayArea";
  if (/seattle/.test(text)) return "spaceNeedle";
  if (/toronto/.test(text)) return "cnTower";
  if (/paris/.test(text)) return "eiffel";
  if (/london/.test(text)) return "bigBen";
  if (/canggu|ubud|bali/.test(text)) return "bali";
  if (/honolulu|maui|los-angeles|palm-springs/.test(text)) return "palm";
  if (/island/.test(text)) return "splitGate";
  if (/patagonia|fitz/.test(text)) return "fitzRoy";
  if (/machu|peru-journey/.test(text)) return "machuPicchu";
  if (/antarctica/.test(text)) return "antarctica";
  if (/iceland|glacier|snow/.test(text)) return "iceland";
  if (/new-york/.test(text)) return "newYork";
  if (/vancouver/.test(text)) return "vancouver";
  if (/big-sur|redwood|cypress|forest|algonquin/.test(text)) return "cypress";
  if (/waterloo|ann-arbor|mountain-view|stanford|mcmaster|cambridge|oxford|university|campus/.test(text)) return "academic";
  if (/niagara/.test(text)) return "waterfall";
  if (/arizona|sedona|phoenix|page|joshua|desert|southwest/.test(text)) return "cactus";
  if (/las-vegas/.test(text)) return "neon";
  if (/cusco|andes|banff|yosemite|tahoe|grand-canyon|mount|mountain/.test(text)) return "mountain";
  if (/lima/.test(text)) return "lima";
  if (/coast|carmel|santa-cruz|point-lobos|victoria|nice|cancun|punta-cana|los-cabos|miami|key-west/.test(text)) return "coast";
  return place.category === "lived" ? "home" : "landmark";
};
