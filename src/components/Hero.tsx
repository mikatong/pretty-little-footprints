import type { Place } from "../types";

type HeroProps = {
  placeCount: number;
  countryCount: number;
  sinceYear: string;
  selectedPlace: Place;
};

export function Hero({ placeCount, countryCount, sinceYear, selectedPlace }: HeroProps) {
  const heroStyle = selectedPlace.photo
    ? ({ "--hero-image": `url("${selectedPlace.photo}")` } as Record<string, string>)
    : undefined;

  return (
    <header className="hero" style={heroStyle}>
      <nav className="hero-nav" aria-label="Primary">
        <span aria-hidden="true" />
        <div>
          <a href="#journey">Timeline</a>
          <a href="#map">Map</a>
          <a href="#stories">Stories</a>
          <a href="#about">About</a>
        </div>
      </nav>

      <div className="hero-content">
        <h1>Pretty Little Maps</h1>
        <p className="hero-title-secondary">A Life in Places</p>

        <dl className="hero-stats" aria-label="Atlas statistics">
          <div>
            <dt>Places</dt>
            <dd>{placeCount}</dd>
          </div>
          <div>
            <dt>Countries</dt>
            <dd>{countryCount}</dd>
          </div>
          <div>
            <dt>Since</dt>
            <dd>{sinceYear}</dd>
          </div>
        </dl>
      </div>
      <div className="hero-destination" aria-label="Selected destination">
        <strong>{selectedPlace.name}</strong>
        <span>{selectedPlace.category === "lived" ? "lived" : "visited"}</span>
      </div>
    </header>
  );
}
