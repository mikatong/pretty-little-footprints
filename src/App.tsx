import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterBar } from "./components/FilterBar";
import { Hero } from "./components/Hero";
import { MapView } from "./components/MapView";
import { PlaceCard } from "./components/PlaceCard";
import { PlaceList } from "./components/PlaceList";
import { places } from "./data/places";
import { siteConfig } from "./data/site";
import type { CategoryFilter, Place } from "./types";

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
      <Hero places={places} />

      <FilterBar activeFilter={activeFilter} places={places} onChange={setActiveFilter} />

      <section className="map-layout">
        <div className="map-panel">
          <MapView places={filteredPlaces} selectedPlace={selectedPlace} onSelect={handleSelectPlace} />
        </div>

        <aside className="side-panel">
          <PlaceCard place={selectedPlace} />
          <PlaceList places={filteredPlaces} selectedPlace={selectedPlace} onSelect={handleSelectPlace} />
        </aside>
      </section>

      <footer className="site-footer">{siteConfig.footer}</footer>
    </main>
  );
}
