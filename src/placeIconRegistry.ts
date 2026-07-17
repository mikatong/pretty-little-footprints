import { places } from "./data/places";
import { resolvePlaceIconKey } from "./iconTaxonomy";
import type { MapIconType } from "./types";

/** Canonical coverage registry: every place record receives an editorial icon key. */
export const placeIconKeyByPlaceId: Record<string, MapIconType> = Object.fromEntries(
  places.map((place) => [place.id, resolvePlaceIconKey(place)]),
);

export const missingPlaceIconIds = places
  .map((place) => place.id)
  .filter((id) => !placeIconKeyByPlaceId[id]);

if (missingPlaceIconIds.length > 0) {
  throw new Error(`Missing editorial icon keys: ${missingPlaceIconIds.join(", ")}`);
}
