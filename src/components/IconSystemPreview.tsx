import { AtlasDestinationIcon } from "./AtlasDestinationIcons";
import { heroDestinations, secondaryArchetypes, type IconDirection } from "../atlasIconTaxonomy";

const directions: IconDirection[] = ["A", "B", "C"];

export function IconSystemPreview() {
  return (
    <main className="icon-system-page">
      <header className="icon-system-header">
        <a href="/" className="icon-system-wordmark">Pretty Little Maps</a>
        <p>Destination Icon System · Editorial Atlas Studies</p>
        <a href="/" className="icon-system-back">← Back to atlas</a>
      </header>

      <section className="icon-system-intro">
        <p className="icon-system-kicker">Phase 1 · Taxonomy</p>
        <h1>One visual grammar, with room for a destination’s own story.</h1>
        <p>Every mark is an inline, stroke-only SVG with a 64 × 64 viewBox, 2.4 px rounded stroke, one primary subject, and at most one supporting element. Color comes only from the existing destination palette.</p>
        <div className="icon-system-archetypes">
          <strong>Secondary archetypes</strong>
          {secondaryArchetypes.map((archetype) => <span key={archetype.id}>{archetype.label}</span>)}
        </div>
      </section>

      <section className="icon-system-grid" aria-label="Hero destination icon options">
        {heroDestinations.map((destination) => (
          <article className="icon-option-card" key={destination.id}>
            <div className="icon-option-heading">
              <p>{destination.group}</p>
              <h2>{destination.label}</h2>
            </div>
            <div className="icon-option-choices">
              {directions.map((direction) => (
                <figure className={direction === destination.recommended ? "is-recommended" : ""} key={direction}>
                  <AtlasDestinationIcon destination={destination.id} direction={direction} />
                  <figcaption>{direction}{direction === destination.recommended ? " · recommended" : ""}</figcaption>
                </figure>
              ))}
            </div>
            <p className="icon-option-rationale"><b>{destination.recommended}</b> {destination.rationale}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

