type HeroProps = {
  placeCount: number;
  countryCount: number;
  sinceYear: string;
};

export function Hero({ placeCount, countryCount, sinceYear }: HeroProps) {
  return (
    <header className="hero">
      <nav className="hero-nav" aria-label="Primary">
        <a className="wordmark" href="/">
          Pretty Little Maps
          <small>by Mika</small>
        </a>
        <dl className="hero-stats" aria-label="Atlas statistics">
          <div>
            <dt>Since</dt>
            <dd>{sinceYear}</dd>
          </div>
          <div>
            <dt>Places</dt>
            <dd>{placeCount}</dd>
          </div>
          <div>
            <dt>Countries</dt>
            <dd>{countryCount}</dd>
          </div>
        </dl>
        <span className="atlas-badge" aria-hidden="true">
          <span>Personal</span>
          <span>Atlas</span>
          <i />
        </span>
        <div className="hero-links">
          <a href="#journey">Timeline</a>
          <a href="#map">Map</a>
          <a href="/stories">Stories</a>
          <a href="#about">About</a>
        </div>
        <div className="hero-actions" aria-hidden="true">
          <span className="hero-icon-button hero-home-icon" />
          <span className="hero-icon-button hero-menu-icon" />
        </div>
      </nav>

    </header>
  );
}
