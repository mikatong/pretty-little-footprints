/**
 * Pretty Little Maps destination-icon system.
 *
 * Hero icons are reserved for destinations that carry the atlas narrative.
 * Secondary places deliberately resolve to a small archetype family so the map
 * remains calm instead of becoming a collection of one-off pictograms.
 */
export const heroDestinations = [
  { id: "chengdu", label: "Chengdu", group: "Asia", recommended: "A", rationale: "A courtyard gate framed by bamboo: local, quiet, and immediately legible." },
  { id: "beijing", label: "Beijing", group: "Asia", recommended: "A", rationale: "A composed imperial roofline reads more gracefully than a dense palace façade." },
  { id: "shanghai", label: "Shanghai", group: "Asia", recommended: "B", rationale: "The Pearl Tower silhouette is distinctive at the smallest map size." },
  { id: "seoul", label: "Seoul", group: "Asia", recommended: "A", rationale: "A mountain-and-tower profile keeps the city specific without a literal skyline." },
  { id: "tokyo", label: "Tokyo", group: "Asia", recommended: "B", rationale: "Tokyo Tower is recognizable while the restrained base avoids a souvenir feel." },
  { id: "canggu", label: "Canggu / Bali", group: "Southeast Asia", recommended: "A", rationale: "A temple gate with one palm carries the coastal Bali story in one glance." },
  { id: "patagonia", label: "Patagonia", group: "South America", recommended: "A", rationale: "A sharp Fitz Roy massif is distinct from both Antarctic ice and Andean ruins." },
  { id: "antarctica", label: "Antarctica", group: "Antarctica", recommended: "A", rationale: "Iceberg and penguin gives Antarctica its own small, narrative silhouette." },
  { id: "machuPicchu", label: "Machu Picchu / Peru", group: "South America", recommended: "A", rationale: "Terraced ruins are more culturally specific than another mountain emblem." },
  { id: "london", label: "London", group: "Europe", recommended: "A", rationale: "A lone clock tower stays tall and readable without a detailed city scene." },
  { id: "paris", label: "Paris", group: "Europe", recommended: "A", rationale: "A tapered Eiffel profile with one ground line is the cleanest editorial read." },
  { id: "newYork", label: "New York", group: "North America", recommended: "B", rationale: "A stepped skyline reads as New York at map scale without a logo-like landmark." },
  { id: "bayArea", label: "San Francisco / Bay Area", group: "North America", recommended: "A", rationale: "A bridge span makes a stronger west-coast silhouette than a generic skyline." },
  { id: "vancouver", label: "Vancouver", group: "North America", recommended: "B", rationale: "A low dome and mountain backdrop balance city and landscape." },
  { id: "iceland", label: "Iceland", group: "North Atlantic", recommended: "A", rationale: "A low glacier and waterline provides a calm, unmistakably northern shape." },
] as const;

export type HeroDestinationId = (typeof heroDestinations)[number]["id"];
export type IconDirection = "A" | "B" | "C";

export const secondaryArchetypes = [
  { id: "academic", label: "Academic arch", useFor: "campuses, university towns, study years" },
  { id: "pagoda", label: "Temple roof", useFor: "secondary East Asian historic stops" },
  { id: "mountain", label: "Single ridge", useFor: "national parks, alpine towns, hikes" },
  { id: "coast", label: "Coastline", useFor: "beaches, coves, shoreline towns" },
  { id: "forest", label: "Cypress / grove", useFor: "forests, redwoods, nature stays" },
  { id: "desert", label: "Cactus", useFor: "desert routes and southwest stops" },
  { id: "city", label: "Compact skyline", useFor: "secondary cities without a signature icon" },
  { id: "waterfall", label: "Waterfall", useFor: "lakes, falls, and river destinations" },
] as const;

