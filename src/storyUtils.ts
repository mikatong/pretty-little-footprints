import type { Place, Story, StoryBlock } from "./types";

export const selectedPlaceStorageKey = "pretty-little-maps:selected-place";

export function getStartTime(place: Place) {
  return new Date(`${place.startDate.length === 4 ? `${place.startDate}-01` : place.startDate}-01`).getTime();
}

export function hasRealPreviewImage(place: Place) {
  return isStoryImagePath(place.photo);
}

export function isStoryImagePath(src?: string) {
  return Boolean(
    src &&
    !src.includes(".gitkeep") &&
    (src.startsWith("/images/stories/") || /^https?:\/\//.test(src))
  );
}

function isMeaningfulBlock(block: StoryBlock) {
  if (block.type === "text") return block.body.trim().length > 0;
  if (block.type === "image") return isStoryImagePath(block.src);
  if (block.type === "gallery") return block.images.some((image) => isStoryImagePath(image.src));
  if (block.type === "quote") return block.body.trim().length > 0;
  if (block.type === "map") return Boolean(block.placeIds?.length || block.routeId);
  return false;
}

export function isMeaningfulStory(story?: Story) {
  if (!story || story.status !== "published") return false;
  return Boolean(
    isStoryImagePath(story.coverImage) ||
    isStoryImagePath(story.previewImage) ||
    story.blocks.some(isMeaningfulBlock)
  );
}

export function hasMeaningfulStoryContent(place: Place) {
  return Boolean(place.hasStory && isMeaningfulStory(place.story));
}

export function getMeaningfulStories(places: Place[]) {
  return places.filter(hasMeaningfulStoryContent).sort((a, b) => getStartTime(a) - getStartTime(b));
}

export function getFeaturedStories(places: Place[]) {
  return places
    .filter((place) => place.story?.featured && hasMeaningfulStoryContent(place))
    .sort((a, b) => getStartTime(b) - getStartTime(a));
}

export function getLatestMeaningfulFeaturedStory(places: Place[]) {
  return [...places]
    .filter((place) => place.featured && hasMeaningfulStoryContent(place))
    .sort((a, b) => getStartTime(b) - getStartTime(a))[0];
}
