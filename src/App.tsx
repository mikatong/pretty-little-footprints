import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hero } from "./components/Hero";
import { MapView } from "./components/MapView";
import { PlaceCard } from "./components/PlaceCard";
import { PlaceGlyph } from "./components/PlaceGlyph";
import { StoryPage } from "./components/StoryPage";
import { places } from "./data/places";
import { getPlaceAccent } from "./placePresentation";
import {
  getLatestMeaningfulFeaturedStory,
  getMeaningfulStories,
  getStartTime,
  hasMeaningfulStoryContent,
  selectedPlaceStorageKey,
} from "./storyUtils";
import type { MapPoint, Place } from "./types";

const sinceYear = "2015";

function getStartYear(place: Place) {
  const match = place.year.match(/\d{4}/);
  return match ? match[0] : sinceYear;
}

function getTimelinePlaces() {
  return places.filter((place) => {
    const year = getStartYear(place);
    return Number(year) >= Number(sinceYear);
  });
}

function getDurationClass(place: Place) {
  const years = place.year.match(/\d{4}/g)?.map(Number);
  if (!years || years.length < 2) return "short";
  const duration = years[1] - years[0];
  if (duration >= 3) return "long";
  if (duration >= 1) return "medium";
  return "short";
}

function getCountryCount(visiblePlaces: Place[]) {
  return new Set(getActualMapPlaces(visiblePlaces).map((place) => place.country)).size;
}

function getPlaceCount(visiblePlaces: Place[]) {
  return new Set(getActualMapPlaces(visiblePlaces).map((place) => `${place.name}, ${place.country}`)).size;
}

function getActualMapPlaces(visiblePlaces: Place[]): MapPoint[] {
  return visiblePlaces.flatMap((place) => {
    if (place.mapPoints && place.mapPoints.length > 0) return place.mapPoints;
    return [{ id: place.id, name: place.name, country: place.country, lat: place.lat, lng: place.lng }];
  });
}

function getStorySlugFromPath() {
  const match = window.location.pathname.match(/^\/stories\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isTimelinePath(pathname = window.location.pathname) {
  return pathname.replace(/\/$/, "") === "/timeline";
}

function hasKnownMonth(place: Place) {
  return /^\d{4}-\d{2}/.test(place.startDate);
}

function sortTimelinePlaces(visiblePlaces: Place[]) {
  return visiblePlaces
    .map((place, index) => ({ place, index }))
    .sort((a, b) => {
      const yearDelta = Number(getStartYear(b.place)) - Number(getStartYear(a.place));
      if (yearDelta !== 0) return yearDelta;

      const aHasMonth = hasKnownMonth(a.place);
      const bHasMonth = hasKnownMonth(b.place);
      if (aHasMonth !== bHasMonth) return aHasMonth ? -1 : 1;

      if (aHasMonth && bHasMonth) {
        const monthDelta = getStartTime(b.place) - getStartTime(a.place);
        if (monthDelta !== 0) return monthDelta;
      }

      return a.index - b.index;
    })
    .map(({ place }) => place);
}

function getTimelineColor(place: Place) {
  if (place.country.includes("United States") || place.country.includes("Canada")) return "north-america";
  if (place.country.includes("Peru") || place.country.includes("Chile") || place.country.includes("Argentina")) {
    return "south-america";
  }
  if (place.country.includes("Japan") || place.country.includes("China") || place.country.includes("Indonesia")) {
    return "asia";
  }
  if (place.country.includes("Antarctica")) return "antarctica";
  return "europe";
}

function TimelineInlinePreview({ place }: { place: Place }) {
  if (!hasMeaningfulStoryContent(place) || !place.story) return null;
  const accent = getPlaceAccent(place);

  return (
    <a
      className="timeline-inline-preview"
      href={`/stories/${place.story.slug}`}
      style={{ "--place-accent": accent.primary, "--place-accent-pale": accent.pale } as Record<string, string>}
    >
      {place.photo ? <img src={place.photo} alt={`${place.name} story preview`} /> : <PlaceGlyph place={place} className="timeline-preview-glyph" />}
      <span>
        <small>{place.dateLabel} · {place.country}</small>
        <strong>{place.story.title ?? place.name}</strong>
        {place.story.summary || place.note ? <em>{place.story.summary || place.note}</em> : null}
        <b>Read story →</b>
      </span>
    </a>
  );
}

function Timeline({
  visiblePlaces,
  selectedPlace,
  expandedYears,
  onToggleYear,
  onActivateYear,
  onSelect,
}: {
  visiblePlaces: Place[];
  selectedPlace: Place;
  expandedYears: Set<string>;
  onToggleYear: (year: string) => void;
  onActivateYear: (year: string) => void;
  onSelect: (place: Place) => void;
}) {
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const groupedPlaces = useMemo(() => {
    return sortTimelinePlaces(visiblePlaces).reduce<Record<string, Place[]>>((groups, place) => {
      const year = getStartYear(place);
      groups[year] = [...(groups[year] ?? []), place];
      return groups;
    }, {});
  }, [visiblePlaces]);

  const years = Object.keys(groupedPlaces).sort((a, b) => {
    return Number(b) - Number(a);
  });

  useEffect(() => {
    itemRefs.current[selectedPlace.id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedPlace.id, expandedYears]);

  return (
    <section className="timeline-panel" id="journey" aria-label="Timeline">
      <div className="module-header">
        <p>Timeline</p>
      </div>
      <div className="timeline-scroll">
        {years.map((year) => {
          const yearPlaces = groupedPlaces[year];
          const isExpanded = expandedYears.has(year);

          return (
            <section className="timeline-year-group" key={year}>
              <button
                className="year-toggle"
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${year} timeline entries`}
                onClick={() => {
                  onActivateYear(year);
                  onToggleYear(year);
                }}
              >
                <span>{year}</span>
                <small>{yearPlaces.length} entries</small>
              </button>

              {isExpanded ? (
                <div className="timeline-items">
                  {yearPlaces.map((place) => {
                    const selected = selectedPlace.id === place.id;
                    return (
                      <article className="timeline-entry" key={place.id}>
                        <button
                          className={`timeline-item ${selected ? "selected" : ""} ${getDurationClass(place)} ${getTimelineColor(place)}`}
                          style={{ "--place-accent": getPlaceAccent(place).primary } as Record<string, string>}
                          ref={(element: HTMLButtonElement | null) => {
                            itemRefs.current[place.id] = element;
                          }}
                          type="button"
                          aria-expanded={selected && hasMeaningfulStoryContent(place) ? "true" : undefined}
                          onClick={() => onSelect(place)}
                        >
                          <span className="timeline-month">{place.dateLabel}</span>
                          <span className="timeline-dot" />
                          <PlaceGlyph place={place} className="timeline-glyph" />
                          <span className="timeline-copy">
                            <strong>{place.name}</strong>
                            <small>{place.country}</small>
                            <em>{place.note}</em>
                          </span>
                        </button>
                        {selected ? <TimelineInlinePreview place={place} /> : null}
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <a className="timeline-link" href="/timeline">View full timeline</a>
    </section>
  );
}

function FullTimelinePage({
  visiblePlaces,
  selectedPlace,
  expandedYears,
  onToggleYear,
  onActivateYear,
  onSelect,
}: {
  visiblePlaces: Place[];
  selectedPlace: Place;
  expandedYears: Set<string>;
  onToggleYear: (year: string) => void;
  onActivateYear: (year: string) => void;
  onSelect: (place: Place) => void;
}) {
  return (
    <main className="full-timeline-page">
      <header className="story-header">
        <a className="story-wordmark" href="/">
          Pretty Little Maps
        </a>
        <a className="story-back" href="/">
          ← Back to atlas
        </a>
      </header>
      <Timeline
        visiblePlaces={visiblePlaces}
        selectedPlace={selectedPlace}
        expandedYears={expandedYears}
        onToggleYear={onToggleYear}
        onActivateYear={onActivateYear}
        onSelect={onSelect}
      />
    </main>
  );
}

export default function App() {
  const timelinePlaces = useMemo(() => getTimelinePlaces(), []);
  const latestYear = useMemo(() => {
    return Math.max(...timelinePlaces.map((place) => Number(getStartYear(place)))).toString();
  }, [timelinePlaces]);
  const latestFeaturedPlace = useMemo(() => getLatestMeaningfulFeaturedStory(timelinePlaces), [timelinePlaces]);
  const storedSelectedPlace = useMemo(() => {
    const storedId = window.sessionStorage.getItem(selectedPlaceStorageKey);
    return timelinePlaces.find((place) => place.id === storedId);
  }, [timelinePlaces]);
  const initialPlace = storedSelectedPlace ?? latestFeaturedPlace ?? timelinePlaces.find((place) => getStartYear(place) === latestYear) ?? timelinePlaces[0] ?? places[0];
  const [selectedPlace, setSelectedPlace] = useState<Place>(initialPlace);
  const [activeYear, setActiveYear] = useState(() => getStartYear(initialPlace));
  const [mapOpen, setMapOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => new Set([latestYear]));
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const storySlug = useMemo(() => getStorySlugFromPath(), [routePath]);

  const storyPlaces = useMemo(() => {
    const storyEntries = getMeaningfulStories(timelinePlaces).reverse();
    if (hasMeaningfulStoryContent(selectedPlace) && !storyEntries.some((place) => place.id === selectedPlace.id)) {
      return [selectedPlace, ...storyEntries];
    }
    return storyEntries;
  }, [selectedPlace, timelinePlaces]);

  const meaningfulStories = useMemo(() => getMeaningfulStories(timelinePlaces), [timelinePlaces]);

  const currentStoryPlace = useMemo(() => {
    if (!storySlug) return null;
    return timelinePlaces.find((place) => place.story?.slug === storySlug) ?? null;
  }, [storySlug, timelinePlaces]);

  const relatedStoryPlaces = useMemo(() => {
    if (!currentStoryPlace?.story) return [];
    const relatedIds = currentStoryPlace.story.relatedEntryIds ?? currentStoryPlace.story.relatedPlaceIds ?? [];
    return relatedIds
      .map((id) => timelinePlaces.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place?.hasStory));
  }, [currentStoryPlace, timelinePlaces]);

  useEffect(() => {
    const year = getStartYear(selectedPlace);
    setExpandedYears((current: Set<string>) => {
      if (current.has(year)) return current;
      return new Set([...current, year]);
    });
  }, [selectedPlace]);

  useEffect(() => {
    if (!isTimelinePath(routePath)) return;
    const years = new Set(timelinePlaces.map(getStartYear));
    setExpandedYears(years);
  }, [routePath, timelinePlaces]);

  useEffect(() => {
    const handlePopState = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleSelectPlace = useCallback((place: Place) => {
    window.sessionStorage.setItem(selectedPlaceStorageKey, place.id);
    setActiveYear(getStartYear(place));
    setSelectedPlace(place);
  }, []);

  const handleToggleYear = useCallback((year: string) => {
    setExpandedYears((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  }, []);

  if (isTimelinePath(routePath)) {
    return (
      <FullTimelinePage
        visiblePlaces={timelinePlaces}
        selectedPlace={selectedPlace}
        expandedYears={expandedYears}
        onToggleYear={handleToggleYear}
        onActivateYear={setActiveYear}
        onSelect={handleSelectPlace}
      />
    );
  }

  if (storySlug) {
    if (currentStoryPlace) {
      return (
        <StoryPage
          place={currentStoryPlace}
          relatedPlaces={relatedStoryPlaces}
          meaningfulStories={meaningfulStories}
          onSelectPlace={handleSelectPlace}
        />
      );
    }

    return (
      <main className="story-page">
        <header className="story-header">
          <a className="story-wordmark" href="/">
            Pretty Little Maps
          </a>
          <a className="story-back" href="/#stories">
            ← Back to atlas
          </a>
        </header>
        <article className="story-article">
          <h1>Story not found</h1>
          <p className="story-empty">This Story is not available yet.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Hero
        placeCount={getPlaceCount(timelinePlaces)}
        countryCount={getCountryCount(timelinePlaces)}
        sinceYear={sinceYear}
        selectedPlace={selectedPlace}
      />

      <section className="atlas-layout">
        <Timeline
          visiblePlaces={timelinePlaces}
          selectedPlace={selectedPlace}
          expandedYears={expandedYears}
          onToggleYear={handleToggleYear}
          onActivateYear={setActiveYear}
          onSelect={handleSelectPlace}
        />

        <section className={`map-section ${mapOpen ? "open" : ""}`} id="map" aria-label="Journey map">
          <button className="map-toggle" type="button" onClick={() => setMapOpen((open: boolean) => !open)}>
            {mapOpen ? "Hide map" : "View map"}
          </button>
          <div className="map-panel">
            <MapView
              places={timelinePlaces}
              selectedPlace={selectedPlace}
              activeYear={activeYear}
              meaningfulStories={meaningfulStories}
              onSelect={handleSelectPlace}
            />
          </div>

          <aside className="story-panel" id="stories">
            <div className="module-header">
              <p>Featured Stories</p>
              <button type="button">View all →</button>
            </div>
            <div className="story-list">
              {storyPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  month={place.dateLabel}
                  selected={selectedPlace.id === place.id}
                  onSelect={handleSelectPlace}
                />
              ))}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
