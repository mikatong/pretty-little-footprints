import type { Place } from "../types";
import { getPlaceAccent } from "../placePresentation";
import { PlaceGlyph } from "./PlaceGlyph";

type PlaceCardProps = {
  place: Place;
  month: string;
  selected: boolean;
  onSelect: (place: Place) => void;
};

export function PlaceCard({ place, month, selected, onSelect }: PlaceCardProps) {
  const storyUrl = place.story ? `/stories/${place.story.slug}` : undefined;
  const previewText = place.story?.previewSummary ?? place.story?.dek ?? place.note;
  const previewImage = place.story?.previewImage ?? place.story?.coverImage ?? place.photo;
  const accent = getPlaceAccent(place);
  const openStory = () => {
    onSelect(place);
    if (storyUrl) window.location.href = storyUrl;
  };

  function handleKeyDown(event: { key: string; preventDefault: () => void }) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openStory();
    }
  }

  return (
    <article
      className={`place-card ${selected ? "selected" : ""}`}
      style={{ "--place-accent": accent.primary, "--place-accent-pale": accent.pale } as Record<string, string>}
      onClick={openStory}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
    >
      <div className="photo-wrap">
        {previewImage ? <img src={previewImage} alt={`${place.name} travel memory`} /> : null}
      </div>
      <span className="place-card-body">
        <small>
          {month} · {place.country}
        </small>
        <strong><PlaceGlyph place={place} className="story-card-icon" />{place.name}</strong>
        {previewText ? <em>{previewText}</em> : null}
        {place.hasStory && storyUrl ? (
          <a
            href={storyUrl}
            onClick={(event: { stopPropagation: () => void }) => {
              event.stopPropagation();
              openStory();
            }}
          >
            Read →
          </a>
        ) : null}
      </span>
    </article>
  );
}
