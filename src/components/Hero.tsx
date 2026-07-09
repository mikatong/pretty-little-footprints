import { MapPin, Sparkles } from "lucide-react";
import { siteConfig } from "../data/site";
import type { Place } from "../types";

type HeroProps = {
  places: Place[];
};

export function Hero({ places }: HeroProps) {
  const countries = new Set(places.map((place) => place.country)).size;

  return (
    <header className="hero">
      <div>
        <p className="eyebrow">
          <Sparkles size={14} aria-hidden="true" />
          {siteConfig.eyebrow}
        </p>
        <h1>{siteConfig.title}</h1>
        <p className="hero-copy">{siteConfig.description}</p>
      </div>

      <div className="hero-stats" aria-label="Map statistics">
        <div>
          <strong>{places.length}</strong>
          <span>places</span>
        </div>
        <div>
          <strong>{countries}</strong>
          <span>regions</span>
        </div>
        <div>
          <MapPin size={18} aria-hidden="true" />
          <span>click a pin</span>
        </div>
      </div>
    </header>
  );
}
