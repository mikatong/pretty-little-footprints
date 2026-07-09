import { siteConfig } from "../data/site";

export function Hero() {
  return (
    <header className="hero">
      <p className="logo-mark">{siteConfig.eyebrow}</p>

      <div className="hero-copy-block">
        <h1>{siteConfig.title}</h1>
        <p className="hero-copy">
          <em>{siteConfig.description}</em>
        </p>
      </div>
    </header>
  );
}
