import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterBar } from "./components/FilterBar";
import { Hero } from "./components/Hero";
import { MapView } from "./components/MapView";
import { PlaceCard } from "./components/PlaceCard";
import { places } from "./data/places";
import { siteConfig } from "./data/site";
import type { CategoryFilter, Place } from "./types";

const categoryLabels: Record<Exclude<CategoryFilter, "all">, string> = {
  lived: "Lived",
  worked: "Worked",
  stayed: "Stayed",
  visited: "Visited",
  "still-mapping": "Still Mapping",
};

const categoryNotes: Record<Exclude<CategoryFilter, "all">, string> = {
  lived: "Places I called home",
  worked: "Places I built and learned",
  stayed: "Places I rested and reset",
  visited: "Places I explored",
  "still-mapping": "The world is still open",
};

export default function App() {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [selectedPlace, setSelectedPlace] = useState<Place>(places[0]);

  const filteredPlaces = useMemo(() => {
    if (activeFilter === "all") return places;
    return places.filter((place) => place.category === activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (!filteredPlaces.some((place) => place.id === selectedPlace.id)) {
      setSelectedPlace(filteredPlaces[0] ?? places[0]);
    }
  }, [filteredPlaces, selectedPlace.id]);

  const handleSelectPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
  }, []);

  return (
    <main className="app-shell">
      <div className="top-line">
        <Hero />
        <FilterBar activeFilter={activeFilter} places={places} onChange={setActiveFilter} />
      </div>

      <section className="map-layout">
        <div className="map-panel">
          <MapView places={filteredPlaces} selectedPlace={selectedPlace} onSelect={handleSelectPlace} />
          <div className="map-legend" aria-label="Map category legend">
            <p>Legend</p>
            {Object.entries(categoryLabels).map(([category, label]) => (
              <span key={category}>
                <i className={`legend-dot ${category}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="side-panel">
          <PlaceCard place={selectedPlace} />
        </aside>
      </section>

      <section className="editorial-grid" aria-label="Travel archive notes">
        <article className="editorial-card chapter-card">
          <div>
            <p className="card-kicker">A map of life</p>
            <h2>Not just places. Chapters.</h2>
            <p>
              Some places shape you. Some heal you. Some challenge you. Some stay with you quietly.
            </p>
          </div>
          <div className="photo-stack" aria-hidden="true">
            <img src="/places/ann-arbor.svg" alt="" />
            <img src="/places/patagonia.svg" alt="" />
            <img src="/places/canggu.svg" alt="" />
          </div>
        </article>

        <article className="editorial-card category-card">
          <p className="card-kicker">The categories</p>
          <div className="category-note-list">
            {Object.entries(categoryLabels).map(([category, label]) => (
              <span key={category}>
                <i className={`legend-dot ${category}`} />
                <strong>{label}</strong>
                <small>{categoryNotes[category as Exclude<CategoryFilter, "all">]}</small>
              </span>
            ))}
          </div>
        </article>

        <article className="editorial-card still-card">
          <p className="card-kicker">Still mapping</p>
          <div className="mini-world" aria-hidden="true" />
          <p>The world is big. The map is never really done. I'm still mapping.</p>
          <p className="closing-line">so much left to be lived</p>
        </article>
      </section>

      <footer className="site-footer">{siteConfig.footer}</footer>
    </main>
  );
}
