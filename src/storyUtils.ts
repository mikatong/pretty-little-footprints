import type { Place } from "./types";

export const selectedPlaceStorageKey = "pretty-little-maps:selected-place";

export function getStartTime(place: Place) {
  return new Date(`${place.startDate.length === 4 ? `${place.startDate}-01` : place.startDate}-01`).getTime();
}

export function hasRealPreviewImage(place: Place) {
  return Boolean(place.photo?.startsWith("/images/stories/"));
}

export function hasMeaningfulStoryContent(place: Place) {
  return Boolean(place.hasStory && ((place.story?.blocks.length ?? 0) > 0 || hasRealPreviewImage(place)));
}

export function getMeaningfulStories(places: Place[]) {
  return places.filter(hasMeaningfulStoryContent).sort((a, b) => getStartTime(a) - getStartTime(b));
}

export function getLatestMeaningfulFeaturedStory(places: Place[]) {
  return [...places]
    .filter((place) => place.featured && hasMeaningfulStoryContent(place))
    .sort((a, b) => getStartTime(b) - getStartTime(a))[0];
}
