import type { Place } from "../types";

type PlaceCardProps = {
  place: Place;
  month: string;
  selected: boolean;
  onSelect: (place: Place) => void;
};

export function PlaceCard({ place, month, selected, onSelect }: PlaceCardProps) {
  const storyUrl = place.story ? `/stories/${place.story.slug}` : undefined;
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
      onClick={openStory}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-current={selected ? "true" : undefined}
    >
      <div className="photo-wrap">
        {place.photo ? <img src={place.photo} alt={`${place.name} travel memory`} /> : null}
      </div>
      <span className="place-card-body">
        <small>
          {month} · {place.country}
        </small>
        <strong>{place.name}</strong>
        {place.note ? <em>{place.note}</em> : null}
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
