import { ExternalLink } from "lucide-react";
import type { Place } from "../types";

const categoryLabels: Record<Place["category"], string> = {
  lived: "Lived",
  worked: "Worked",
  stayed: "Stayed",
  visited: "Visited",
  "still-mapping": "Still Mapping",
};

type PlaceCardProps = {
  place: Place;
};

export function PlaceCard({ place }: PlaceCardProps) {
  return (
    <article className="place-card">
      <div className="photo-wrap">
        {place.photo ? (
          <img src={place.photo} alt={`${place.name} travel memory`} />
        ) : (
          <div className="photo-fallback">{place.name}</div>
        )}
      </div>

      <div className="place-card-body">
        <p className={`category-pill ${place.category}`}>{categoryLabels[place.category]}</p>
        <h2>{place.name}</h2>
        <p className="place-meta">
          {place.country} · {place.year}
        </p>
        <p className="place-note">{place.note}</p>

        {place.links && place.links.length > 0 ? (
          <div className="place-links">
            {place.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                {link.label}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
