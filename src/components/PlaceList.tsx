import type { Place } from "../types";

type PlaceListProps = {
  places: Place[];
  selectedPlace: Place;
  onSelect: (place: Place) => void;
};

export function PlaceList({ places, selectedPlace, onSelect }: PlaceListProps) {
  return (
    <section className="place-list" aria-label="Place list">
      {places.map((place) => (
        <button
          key={place.id}
          type="button"
          className={selectedPlace.id === place.id ? "place-row selected" : "place-row"}
          onClick={() => onSelect(place)}
        >
          <span>
            <strong>{place.name}</strong>
            <small>{place.country}</small>
          </span>
          <em>{place.year}</em>
        </button>
      ))}
    </section>
  );
}
