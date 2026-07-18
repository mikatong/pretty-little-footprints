import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapIconType, MapPoint, Place } from "../types";
import { getPlaceAccent, getPlaceIconType, type PlaceAccent } from "../placePresentation";
import { placeIconKeyByPlaceId } from "../placeIconRegistry";
import { getStartTime, hasMeaningfulStoryContent, isStoryImagePath } from "../storyUtils";

type MapViewProps = {
  places: Place[];
  selectedPlace: Place;
  selectionRevision: number;
  activeYear: string;
  meaningfulStories: Place[];
  onSelect: (place: Place) => void;
};

type ValidPoint = {
  id: string;
  entryId: string;
  title: string;
  locationType: "lived" | "visited";
  iconType: MapIconType;
  iconImage: string;
  selectedIconImage: string;
  accent: PlaceAccent;
  year: number;
  coordinates: [number, number];
};

const mapStyle = "https://tiles.openfreemap.org/styles/positron";
const worldCenter: [number, number] = [8, 12];
const worldBounds: [[number, number], [number, number]] = [
  [-179.5, -72],
  [179.5, 82],
];
const pointSourceId = "map-points";
const visitedCountrySourceId = "visited-country-labels";
const yearRouteSourceId = "journal-year-route";
const flightSourceId = "journal-route-flights";
const storyPreviewSourceId = "journal-story-previews";
const debugMapQueryParam = "debugMap";
const debugJourneyMap = false;
const appMapSources = new Set([
  pointSourceId,
  visitedCountrySourceId,
  yearRouteSourceId,
  flightSourceId,
  storyPreviewSourceId,
]);
const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
} as const;

const yearRouteColors: Record<string, string> = {
  "2026": "#A65F4C",
  "2025": "#8E6AA6",
  "2024": "#5F8EAE",
  "2023": "#6F9277",
  "2022": "#B69A73",
  "2021": "#8FA58F",
  "2020": "#A68477",
  "2019": "#8798A8",
  "2018": "#A48EBB",
  "2017": "#8E9B7C",
  "2016": "#B88C73",
  "2015": "#8D624C",
};

const getWorldZoom = () => {
  if (typeof window === "undefined") return 1.2;
  if (window.innerWidth < 560) return 0.62;
  if (window.innerWidth < 900) return 0.88;
  if (window.innerWidth < 1300) return 1.08;
  return 1.24;
};

const getStartYear = (place: Place) => place.year.match(/\d{4}/)?.[0] ?? place.startDate.slice(0, 4);

const shouldDebugMap = () => {
  if (typeof window === "undefined") return debugJourneyMap;
  return debugJourneyMap || new URLSearchParams(window.location.search).has(debugMapQueryParam);
};

const isValidCoordinate = (point: MapPoint | Place) => {
  return (
    typeof point.lng === "number" &&
    typeof point.lat === "number" &&
    point.lng >= -180 &&
    point.lng <= 180 &&
    point.lat >= -90 &&
    point.lat <= 90
  );
};

const getRawPoints = (place: Place): (MapPoint | Place)[] => {
  return place.mapPoints && place.mapPoints.length > 0 ? place.mapPoints : [place];
};

const iconImageName = (iconType: MapIconType, accentKey: string, state: "lived" | "visited" | "selected") => {
  return `plm-${iconType}-${accentKey}-${state}`;
};

const flightIconName = (colorKey: string) => `plm-flight-${colorKey}`;
const storyPreviewImageName = (placeId: string) => `plm-story-preview-${placeId}`;

const getIconSvg = (iconType: MapIconType, accent: PlaceAccent, state: "lived" | "visited" | "selected") => {
  const lived = state === "lived";
  const selected = state === "selected";
  const stroke = selected ? accent.dark : lived ? accent.dark : accent.primary;
  const fill = selected || lived ? accent.pale : "#FFFDFC";
  const opacity = selected ? "1" : "0.93";
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  const line = `fill="none" stroke="${stroke}" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  // Keep the selected location gently anchored, but leave regular destinations
  // as clean editorial illustrations rather than icon-in-a-bubble badges.
  const bg = "";
  const shapes: Record<MapIconType, string> = {
    home: `<path ${common} d="M12 24 24 14l12 10v10H14V24z"/><path ${line} d="M21 34v-8h6v8"/>`,
    city: `<path ${common} d="M12 36V18h8v18M23 36V12h11v24"/><path ${line} d="M15 22h2M15 27h2M26 17h3M26 23h3M26 29h3"/>`,
    academic: `<path ${common} d="M10 22h28L24 13z"/><path ${line} d="M14 24v11M21 24v11M28 24v11M35 24v11M11 36h26"/>`,
    temple: `<path ${common} d="M12 20h24l-12-8z"/><path ${line} d="M15 23v12M22 23v12M29 23v12M12 36h24"/>`,
    palace: `<path ${common} d="M10 20h28l-4-5H14z"/><path ${line} d="M13 22h22M16 25v10M24 25v10M32 25v10M12 36h24"/>`,
    pagoda: `<path ${common} d="M13 17h22l-11-6z"/><path ${common} d="M15 25h18l-9-5z"/><path ${line} d="M19 26v9M29 26v9M15 36h18"/>`,
    tower: `<path ${common} d="M24 11c4 5 6 12 6 25H18c0-13 2-20 6-25z"/><path ${line} d="M18 21h12M17 29h14M24 8v5"/>`,
    bridge: `<path ${line} d="M10 31h28M13 30c5-9 17-9 22 0M16 18v18M32 18v18M14 22h20"/>`,
    mountain: `<path ${common} d="M9 36 22 13l6 10 3-5 8 18z"/><path ${line} d="m22 13 3 11 3-2"/>`,
    fitzRoy: `<path ${common} d="M8 36 18 13l5 12 5-16 12 27z"/><path ${line} d="m28 9 1 17 4-5M18 13l3 13 3-3"/>`,
    machuPicchu: `<path ${common} d="M10 34h27"/><path ${line} d="M13 30h7M18 26h8M24 22h9M30 18h6M15 30v4M24 26v8M33 18v16"/>`,
    iceberg: `<path ${common} d="M10 35 22 12l6 11 4-5 7 17z"/><path ${line} d="M13 36c6 3 16 3 23 0M22 12l1 14 5-3"/>`,
    snow: `<path ${line} d="M24 10v28M14 17l20 14M34 17 14 31M16 24h16"/><circle cx="24" cy="24" r="3" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    forest: `<path ${common} d="M19 32h10L24 12z"/><path ${common} d="M11 35h10l-5-15z"/><path ${line} d="M24 32v5M16 35v3"/>`,
    cypress: `<path ${common} d="M17 34c-3-8 1-19 8-24 6 8 7 17 2 24z"/><path ${line} d="M24 14c-1 8-2 15-1 24M14 36h19"/>`,
    coast: `<path ${common} d="M12 33c7-8 15-11 25-10v10z"/><path ${line} d="M10 18c6 3 11 3 17 0M11 24c5 2 9 2 14 0"/>`,
    tropical: `<path ${line} d="M24 37c3-10 3-18 0-27"/><path ${common} d="M24 14c-8-4-13-1-16 5 6 1 11-1 16-5z"/><path ${common} d="M25 14c8-4 13-1 16 5-6 1-11-1-16-5z"/>`,
    palm: `<path ${line} d="M24 37c3-10 3-18 0-27"/><path ${common} d="M24 14c-8-4-13-1-16 5 6 1 11-1 16-5z"/><path ${common} d="M25 14c8-4 13-1 16 5-6 1-11-1-16-5z"/>`,
    splitGate: `<path ${common} d="M12 36V18l8-4v22M36 36V18l-8-4v22"/><path ${line} d="M13 18h8M27 18h8M22 36h4"/>`,
    desert: `<path ${common} d="M21 36V14a4 4 0 0 1 8 0v22"/><path ${line} d="M21 24h-4a4 4 0 0 1-4-4M29 26h4a4 4 0 0 0 4-4"/>`,
    cactus: `<path ${common} d="M21 36V14a4 4 0 0 1 8 0v22"/><path ${line} d="M21 24h-4a4 4 0 0 1-4-4M29 26h4a4 4 0 0 0 4-4"/>`,
    waterfall: `<path ${common} d="M13 13h22l-5 23H18z"/><path ${line} d="M19 17v14M24 17v16M29 17v14"/>`,
    eiffel: `<path ${line} d="M24 10 14 36M24 10l10 26M18 24h12M16 31h16M20 18h8"/>`,
    bigBen: `<path ${common} d="M18 36V16h12v20"/><path ${line} d="M16 16h16M24 9v7M21 22h6M24 19v4"/>`,
    cnTower: `<path ${line} d="M24 9v28M18 22h12M20 26h8M21 14h6"/><circle cx="24" cy="20" r="5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`,
    spaceNeedle: `<path ${line} d="M24 11v25M15 20h18M18 17h12M19 36h10M18 26l12 10M30 26 18 36"/>`,
    neon: `<path ${common} d="M12 17h24v12H12z"/><path ${line} d="M16 23h16M18 29v7M30 29v7"/>`,
    landmark: `<path ${common} d="M14 36h20l-3-15H17z"/><path ${line} d="M24 12v24M18 12h12M17 20h14"/>`,
    default: `<path ${common} d="M24 10c7 0 12 5 12 11 0 7-12 17-12 17S12 28 12 21c0-6 5-11 12-11z"/><circle cx="24" cy="21" r="3.5" fill="${stroke}"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 48 48">${bg}${shapes[iconType]}</svg>`;
};

const getFlightSvg = (color: string) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48"><path d="M5 25 20 21 28 7l4 1-4 14 14 6-1 4-17-3-8 9-4-1 4-10-11 1z" fill="${color}" stroke="#FFFDF8" stroke-width="1.35" stroke-linejoin="round"/><path d="m20 21 8 1M24 29l4-7" fill="none" stroke="#FFFDF8" stroke-width="1.05" stroke-linecap="round" opacity=".9"/></svg>`;
};

const loadSvgImage = (svg: string, size = 48) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(size, size);
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
};

const loadImage = (src: string, size = 64) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(size, size);
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
};

const registerMapIcons = async (map: maplibregl.Map, places: Place[]) => {
  const usedIcons = places.flatMap((place) => getValidPoints(place)).map((point) => ({ iconType: point.iconType, accent: point.accent }));
  const uniqueIcons = [...new Map(usedIcons.map((icon) => [`${icon.iconType}-${icon.accent.key}`, icon])).values()];
  await Promise.all(uniqueIcons.flatMap(({ iconType, accent }) =>
    (["lived", "visited", "selected"] as const).map(async (state) => {
      const name = iconImageName(iconType, accent.key, state);
      if (map.hasImage(name)) return;
      const image = await loadSvgImage(getIconSvg(iconType, accent, state));
      map.addImage(name, image, { pixelRatio: 2 });
    })
  ));
  const routeColors = [...new Set(places.map(getStartYear))].map((year) => [year, yearRouteColors[year] ?? "#8D624C"] as const);
  await Promise.all(routeColors.map(async ([year, color]) => {
    const name = flightIconName(year);
    if (map.hasImage(name)) return;
    map.addImage(name, await loadSvgImage(getFlightSvg(color), 64), { pixelRatio: 2 });
  }));
};

const registerStoryPreviewImages = async (map: maplibregl.Map, storyPlaces: Place[]) => {
  await Promise.all(storyPlaces.map(async (place) => {
    const storyImage = place.story?.previewImage ?? place.story?.coverImage;
    if (!storyImage || !isStoryImagePath(storyImage)) return;
    const name = storyPreviewImageName(place.id);
    if (map.hasImage(name)) return;
    try {
      const image = await loadImage(storyImage, 72);
      map.addImage(name, image, { pixelRatio: 2 });
    } catch {
      if (import.meta.env.DEV) console.warn(`Could not load map story preview image for ${place.id}: ${storyImage}`);
    }
  }));
};

const getValidPoints = (place: Place): ValidPoint[] => {
  return getRawPoints(place).flatMap((point) => {
    if (!isValidCoordinate(point)) {
      if (import.meta.env.DEV && (point.lat !== undefined || point.lng !== undefined)) {
        console.warn(`Skipping invalid map coordinate for ${place.id}:${point.id}`, { lat: point.lat, lng: point.lng });
      }
      return [];
    }
    const locationType = place.category === "lived" ? "lived" : "visited";
    const iconType = point === place ? (placeIconKeyByPlaceId[place.id] ?? getPlaceIconType(place, point)) : getPlaceIconType(place, point);
    const accent = getPlaceAccent(place, point);
    return [{
      id: point.id,
      entryId: place.id,
      title: point.name,
      locationType,
      iconType,
      iconImage: iconImageName(iconType, accent.key, locationType),
      selectedIconImage: iconImageName(iconType, accent.key, "selected"),
      accent,
      year: Number(getStartYear(place)),
      coordinates: [point.lng as number, point.lat as number],
    }];
  });
};

const getPrimaryPoint = (place: Place): ValidPoint | undefined => getValidPoints(place)[0];
const getSelectedPointIds = (place: Place) => new Set(getValidPoints(place).map((point) => point.id));

const getPointFeatureCollection = (places: Place[], selectedPlace: Place) => {
  const selectedPointIds = getSelectedPointIds(selectedPlace);
  return {
    type: "FeatureCollection",
    features: places.flatMap((place) => getValidPoints(place).map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        entryId: point.entryId,
        parentEntryId: point.entryId,
        title: point.title,
        year: point.year,
        locationType: point.locationType,
        iconType: point.iconType,
        iconImage: point.iconImage,
        selectedIconImage: point.selectedIconImage,
        accentKey: point.accent.key,
        accentColor: point.accent.primary,
        accentDark: point.accent.dark,
        selected: point.entryId === selectedPlace.id,
        relatedToSelectedJourney: point.entryId === selectedPlace.id && selectedPointIds.has(point.id),
      },
      geometry: { type: "Point", coordinates: point.coordinates },
    }))),
  };
};

const getVisitedCountryFeatureCollection = (places: Place[]) => {
  const countries = new Map<string, ValidPoint>();
  places.forEach((place) => {
    const point = getPrimaryPoint(place);
    if (point && !countries.has(place.country)) countries.set(place.country, point);
  });
  return {
    type: "FeatureCollection" as const,
    features: [...countries].map(([country, point]) => ({
      type: "Feature" as const,
      properties: { country },
      geometry: { type: "Point" as const, coordinates: point.coordinates },
    })),
  };
};

const getChronologicalPlacesForYear = (places: Place[], activeYear: string) => {
  return places
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => getStartYear(place) === activeYear)
    .sort((a, b) => {
      const timeDelta = getStartTime(a.place) - getStartTime(b.place);
      return timeDelta || a.index - b.index;
    })
    .map(({ place }) => place);
};

// Chronology made the long-haul lines crisscross one another. Starting with the
// earliest entry still gives each year a meaningful anchor, then the map follows
// the nearest unvisited location for a calmer, more legible atlas composition.
const getNearestNeighbourPlacesForYear = (places: Place[], activeYear: string) => {
  const chronological = getChronologicalPlacesForYear(places, activeYear);
  if (chronological.length < 3) return chronological;
  const ordered = [chronological[0]];
  const remaining = chronological.slice(1);
  while (remaining.length > 0) {
    const from = getPrimaryPoint(ordered[ordered.length - 1]);
    if (!from) break;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((place, index) => {
      const point = getPrimaryPoint(place);
      if (!point) return;
      const distance = getDistanceKm(from.coordinates, point.coordinates);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    ordered.push(remaining.splice(closestIndex, 1)[0]);
  }
  return ordered;
};

const toRadians = (degrees: number) => degrees * Math.PI / 180;
const toDegrees = (radians: number) => radians * 180 / Math.PI;

const getDistanceKm = (from: [number, number], to: [number, number]) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to[1] - from[1]);
  const dLng = toRadians(to[0] - from[0]);
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBearing = (from: [number, number], to: [number, number]) => {
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const dLng = toRadians(to[0] - from[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
};

// Creates restrained editorial curves while preserving exact segment endpoints.
const getCurvedSegment = (from: [number, number], to: [number, number], segmentIndex: number) => {
  const distanceKm = getDistanceKm(from, to);
  if (distanceKm < 35) return [from, to];
  const steps = distanceKm > 2500 ? 24 : distanceKm > 700 ? 18 : 12;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const direction = segmentIndex % 2 === 0 ? 1 : -1;
  const offset = Math.min(Math.max(length * (distanceKm > 2500 ? 0.16 : 0.1), 0.24), distanceKm > 2500 ? 11 : 4.8);
  const control: [number, number] = [
    (from[0] + to[0]) / 2 + (-dy / length) * offset * direction,
    Math.max(-72, Math.min(82, (from[1] + to[1]) / 2 + (dx / length) * offset * direction)),
  ];
  return Array.from({ length: steps + 1 }, (_, step) => {
    const t = step / steps;
    const inv = 1 - t;
    return [
      inv * inv * from[0] + 2 * inv * t * control[0] + t * t * to[0],
      inv * inv * from[1] + 2 * inv * t * control[1] + t * t * to[1],
    ] as [number, number];
  });
};

const getCurvedRouteCoordinates = (coordinates: [number, number][]) => {
  return coordinates.flatMap((coordinate, index) => {
    const next = coordinates[index + 1];
    if (!next) return index === 0 ? [coordinate] : [];
    const segment = getCurvedSegment(coordinate, next, index);
    return index === 0 ? segment : segment.slice(1);
  });
};

const getFlightFeatures = (coordinates: [number, number][], colorKey: string) => coordinates.slice(0, -1).flatMap((from, index) => {
  const to = coordinates[index + 1];
  if (getDistanceKm(from, to) < 1200) return [];
  const curve = getCurvedSegment(from, to, index);
  const midpoint = curve[Math.floor(curve.length / 2)];
  const next = curve[Math.min(curve.length - 1, Math.floor(curve.length / 2) + 1)];
  return [{
    type: "Feature" as const,
    properties: { colorKey, iconImage: flightIconName(colorKey), bearing: getBearing(midpoint, next) },
    geometry: { type: "Point" as const, coordinates: midpoint },
  }];
}).slice(0, 3);

const getRouteCoordinatesForPlace = (selectedPlace: Place, places: Place[]) => {
  const selectedCoordinates = getValidPoints(selectedPlace).map((point) => point.coordinates);
  const hasExplicitRoute = Boolean(selectedPlace.mapPoints && selectedCoordinates.length >= 2);
  return hasExplicitRoute
    ? selectedCoordinates
    : getNearestNeighbourPlacesForYear(places, getStartYear(selectedPlace))
      .map(getPrimaryPoint)
      .filter((point): point is ValidPoint => Boolean(point))
      .map((point) => point.coordinates);
};

const focusSelectedPlace = (map: maplibregl.Map, selectedPlace: Place, duration = 650) => {
  const point = getPrimaryPoint(selectedPlace);
  if (point) map.easeTo({ center: point.coordinates, zoom: Math.max(map.getZoom(), 2.75), duration, essential: true });
};

const getYearRouteFeatureCollection = (places: Place[], activeYear: string) => {
  return {
    type: "FeatureCollection" as const,
    features: [activeYear].flatMap((year) => {
      const coordinates = getNearestNeighbourPlacesForYear(places, year)
        .map(getPrimaryPoint)
        .filter((point): point is ValidPoint => Boolean(point))
        .map((point) => point.coordinates);
      if (coordinates.length < 2) return [];
      return [{
        type: "Feature" as const,
        properties: { id: year, color: yearRouteColors[year] ?? "#8D624C" },
        geometry: { type: "LineString" as const, coordinates: getCurvedRouteCoordinates(coordinates) },
      }];
    }),
  };
};

const getFlightFeatureCollection = (places: Place[], activeYear: string) => ({
  type: "FeatureCollection" as const,
  features: [activeYear].flatMap((year) => {
    const coordinates = getNearestNeighbourPlacesForYear(places, year)
      .map(getPrimaryPoint)
      .filter((point): point is ValidPoint => Boolean(point))
      .map((point) => point.coordinates);
    return getFlightFeatures(coordinates, year);
  }),
});

// This is the sole route builder. It derives every active route from the canonical
// selected id, so a popup or a previous map selection can never influence it.
const getStoryPreviewFeatureCollection = (places: Place[], selectedPlace: Place) => {
  return {
    type: "FeatureCollection",
    features: places.flatMap((place) => {
      const point = getPrimaryPoint(place);
      const storyImage = place.story?.previewImage ?? place.story?.coverImage;
      if (!point || !hasMeaningfulStoryContent(place) || !isStoryImagePath(storyImage)) return [];
      const accent = getPlaceAccent(place);
      return [{
        type: "Feature",
        properties: {
          entryId: place.id,
          title: place.name,
          country: place.country,
          dateLabel: place.dateLabel,
          note: place.story?.previewSummary || place.story?.dek || place.note,
          photo: storyImage,
          storyUrl: place.story ? `/stories/${place.story.slug}` : "",
          previewImage: storyPreviewImageName(place.id),
          featured: place.featured,
          selected: place.id === selectedPlace.id,
          accentColor: accent.primary,
          accentDark: accent.dark,
        },
        geometry: { type: "Point", coordinates: point.coordinates },
      }];
    }),
  };
};

const setCursor = (map: maplibregl.Map, cursor: string) => {
  map.getCanvas().style.cursor = cursor;
};

const layerText = (layer: maplibregl.LayerSpecification) => {
  const sourceLayer = "source-layer" in layer ? layer["source-layer"] : "";
  const metadata = "metadata" in layer ? JSON.stringify(layer.metadata ?? {}) : "";
  return `${layer.id} ${sourceLayer ?? ""} ${metadata}`.toLowerCase();
};

const shouldHideBaseMapSymbolLayer = (layer: maplibregl.LayerSpecification) => {
  if (layer.type !== "symbol") return false;
  if ("source" in layer && typeof layer.source === "string" && appMapSources.has(layer.source)) return false;
  const text = layerText(layer);
  // Basemap labels are intentionally limited to water names. All visited place
  // labels come from the application data layers below, avoiding unrelated
  // countries, cities, regions, and POIs at every zoom level.
  return !/(marine|ocean|sea|water_name)/.test(text);
};

const setPaintIfChanged = (map: maplibregl.Map, layerId: string, property: string, value: unknown) => {
  const current = map.getPaintProperty(layerId, property);
  if (JSON.stringify(current) !== JSON.stringify(value)) {
    map.setPaintProperty(layerId, property, value as never);
  }
};

const softenBaseMapLayer = (map: maplibregl.Map, layer: maplibregl.LayerSpecification) => {
  const text = layerText(layer);
  try {
    if (layer.type === "background") {
      // In the real OpenFreeMap Positron style, the background is the land
      // canvas; water is drawn above it by the separate `water` fill layer.
      setPaintIfChanged(map, layer.id, "background-color", "#F0E6D5");
      return;
    }
    if (layer.type === "fill") {
      if (/(water|ocean|sea)/.test(text)) {
        setPaintIfChanged(map, layer.id, "fill-color", "#FBF7EF");
        setPaintIfChanged(map, layer.id, "fill-opacity", 1);
      } else if (/(land|earth|country|admin|boundary|park|natural|landcover|landuse)/.test(text)) {
        setPaintIfChanged(map, layer.id, "fill-color", "#F0E6D5");
        setPaintIfChanged(map, layer.id, "fill-opacity", 1);
      }
      return;
    }
    if (layer.type === "line") {
      if (/(boundary|admin|country|coast)/.test(text)) {
        setPaintIfChanged(map, layer.id, "line-color", /(admin|boundary)/.test(text) ? "#E3D8C8" : "#D7C9B5");
        setPaintIfChanged(map, layer.id, "line-opacity", 0.68);
        setPaintIfChanged(map, layer.id, "line-width", 0.62);
      } else if (/(road|rail|transport|ferry)/.test(text)) {
        setPaintIfChanged(map, layer.id, "line-opacity", 0);
      }
      return;
    }
    if (layer.type === "symbol") {
      if (/(marine|ocean|sea|water)/.test(text)) {
        setPaintIfChanged(map, layer.id, "text-color", "#2D5991");
        setPaintIfChanged(map, layer.id, "text-halo-color", "#FBF7EF");
        setPaintIfChanged(map, layer.id, "text-halo-width", 0.8);
        setPaintIfChanged(map, layer.id, "text-opacity", 0.72);
      }
    }
  } catch {
    // Third-party styles vary; ignore unsupported paint properties.
  }
};

const runtimeMapDiagnostics = (map: maplibregl.Map) => {
  const layers = map.getStyle().layers ?? [];
  const layerIds = new Set(layers.map((layer) => layer.id));
  const requiredLayers = ["journal-year-route", "route-flight-icons", "visited-place-labels", "visited-country-labels"];
  const oceanLayers = layers.filter((layer) => layer.type === "symbol" && /(marine|ocean|sea|water_name)/.test(layerText(layer)));
  const landWaterLayers = layers.filter((layer) => layer.type === "background" || (layer.type === "fill" && /(water|land|earth|landcover|landuse)/.test(layerText(layer))));
  return {
    ready: requiredLayers.every((id) => layerIds.has(id)) && oceanLayers.length > 0 && landWaterLayers.length > 0,
    missingLayers: requiredLayers.filter((id) => !layerIds.has(id)),
    oceanLayerIds: oceanLayers.map((layer) => layer.id),
    landWaterLayerIds: landWaterLayers.map((layer) => layer.id),
  };
};

const styleBaseMap = (map: maplibregl.Map) => {
  const hidden: string[] = [];
  const inspected: string[] = [];
  map.getStyle().layers?.forEach((layer) => {
    if (layer.type === "symbol" && (!("source" in layer) || typeof layer.source !== "string" || !appMapSources.has(layer.source))) {
      inspected.push(`${layer.id}:${"source-layer" in layer ? layer["source-layer"] ?? "" : ""}`);
    }
    if (shouldHideBaseMapSymbolLayer(layer)) {
      try {
        if (map.getLayoutProperty(layer.id, "visibility") !== "none") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
        hidden.push(layer.id);
      } catch {
        return;
      }
      return;
    }
    if (!("source" in layer) || typeof layer.source !== "string" || !appMapSources.has(layer.source)) {
      softenBaseMapLayer(map, layer);
    }
  });
  if (typeof window !== "undefined") {
    (window as unknown as {
      __plmHiddenBaseMapLayers?: string[];
      __plmInspectedBaseMapSymbolLayers?: string[];
      __plmMap?: maplibregl.Map;
    }).__plmHiddenBaseMapLayers = hidden.length || inspected.length ? hidden : (window as unknown as { __plmHiddenBaseMapLayers?: string[] }).__plmHiddenBaseMapLayers ?? [];
    (window as unknown as { __plmInspectedBaseMapSymbolLayers?: string[] }).__plmInspectedBaseMapSymbolLayers = inspected.length
      ? inspected
      : (window as unknown as { __plmInspectedBaseMapSymbolLayers?: string[] }).__plmInspectedBaseMapSymbolLayers ?? [];
  }
};

export function MapView({ places, selectedPlace, selectionRevision, activeYear, meaningfulStories, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastCameraSelectionRef = useRef<string | null>(null);
  const lastSelectionRevisionRef = useRef(selectionRevision);
  const [mapReady, setMapReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(null);
  const pointData = useMemo(() => getPointFeatureCollection(places, selectedPlace), [places, selectedPlace]);
  const visitedCountryData = useMemo(() => getVisitedCountryFeatureCollection(places), [places]);
  // The selected record is canonical: routes and aircraft always use its year.
  const selectedYear = getStartYear(selectedPlace);
  const yearRouteData = useMemo(() => getYearRouteFeatureCollection(places, selectedYear), [places, selectedYear]);
  const flightData = useMemo(() => getFlightFeatureCollection(places, selectedYear), [places, selectedYear]);
  const storyPreviewData = useMemo(() => getStoryPreviewFeatureCollection(meaningfulStories, selectedPlace), [meaningfulStories, selectedPlace]);
  const latestSelectedPlaceRef = useRef(selectedPlace);
  const latestPlacesRef = useRef(places);
  const latestMeaningfulStoriesRef = useRef(meaningfulStories);
  const latestOnSelectRef = useRef(onSelect);
  const latestPointDataRef = useRef(pointData);
  const latestVisitedCountryDataRef = useRef(visitedCountryData);
  const latestYearRouteDataRef = useRef(yearRouteData);
  const latestFlightDataRef = useRef(flightData);
  const latestStoryPreviewDataRef = useRef(storyPreviewData);
  latestSelectedPlaceRef.current = selectedPlace;
  latestPlacesRef.current = places;
  latestMeaningfulStoriesRef.current = meaningfulStories;
  latestOnSelectRef.current = onSelect;
  latestPointDataRef.current = pointData;
  latestVisitedCountryDataRef.current = visitedCountryData;
  latestYearRouteDataRef.current = yearRouteData;
  latestFlightDataRef.current = flightData;
  latestStoryPreviewDataRef.current = storyPreviewData;

  const positionSelectedPreview = useCallback((map: maplibregl.Map) => {
    const point = getPrimaryPoint(latestSelectedPlaceRef.current);
    if (!point) return;
    const projected = map.project(point.coordinates);
    const canvas = map.getCanvas();
    setPreviewPosition({
      left: Math.max(18, Math.min(projected.x + 26, canvas.clientWidth - 254)),
      top: Math.max(18, Math.min(projected.y - 142, canvas.clientHeight - 174)),
    });
  }, []);

  const applyLatestMapData = useCallback((map: maplibregl.Map) => {
    const pointSource = map.getSource(pointSourceId) as maplibregl.GeoJSONSource | undefined;
    const visitedCountrySource = map.getSource(visitedCountrySourceId) as maplibregl.GeoJSONSource | undefined;
    const yearRouteSource = map.getSource(yearRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    const flightSource = map.getSource(flightSourceId) as maplibregl.GeoJSONSource | undefined;
    const storyPreviewSource = map.getSource(storyPreviewSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!pointSource || !visitedCountrySource || !yearRouteSource || !flightSource || !storyPreviewSource) return false;
    pointSource.setData(latestPointDataRef.current as never);
    visitedCountrySource.setData(latestVisitedCountryDataRef.current as never);
    yearRouteSource.setData(latestYearRouteDataRef.current as never);
    flightSource.setData(latestFlightDataRef.current as never);
    storyPreviewSource.setData(latestStoryPreviewDataRef.current as never);
    return true;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: worldCenter,
      zoom: getWorldZoom(),
      minZoom: 0.55,
      maxZoom: 5,
      maxBounds: worldBounds,
      renderWorldCopies: false,
      attributionControl: false,
    });
    if (import.meta.env.DEV) {
      (window as unknown as { __plmMap?: maplibregl.Map }).__plmMap = map;
    }
    let styleCleanupTimer = 0;
    const publishMapDiagnostics = () => {
      const diagnostics = runtimeMapDiagnostics(map);
      containerRef.current?.setAttribute("data-map-diagnostics", diagnostics.ready ? "ready" : `missing:${diagnostics.missingLayers.join(",")}`);
      if (import.meta.env.DEV) {
        (window as unknown as { __plmMapDiagnostics?: ReturnType<typeof runtimeMapDiagnostics> }).__plmMapDiagnostics = diagnostics;
      }
    };
    const scheduleBaseMapStyle = () => {
      window.clearTimeout(styleCleanupTimer);
      styleCleanupTimer = window.setTimeout(() => {
        styleBaseMap(map);
        publishMapDiagnostics();
      }, 160);
    };
    map.setMaxZoom(7.5);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl({
      onAdd(controlMap) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-home-control";
        button.setAttribute("aria-label", "Return to world atlas view");
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10h-17z"/><path d="M9.5 20v-6h5v6"/></svg>';
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          controlMap.easeTo({ center: worldCenter, zoom: getWorldZoom(), duration: 650, essential: true });
        });
        const container = document.createElement("div");
        container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        container.append(button);
        return container;
      },
      onRemove() {},
    }, "top-right");
    map.on("load", () => {
      void (async () => {
        styleBaseMap(map);
        window.setTimeout(() => styleBaseMap(map), 250);
        await registerMapIcons(map, latestPlacesRef.current);
        await registerStoryPreviewImages(map, latestMeaningfulStoriesRef.current);
        map.addSource(yearRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(flightSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(storyPreviewSourceId, {
          type: "geojson",
          data: emptyFeatureCollection,
        });
        map.addSource(pointSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(visitedCountrySourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addLayer({ id: "journal-year-route-casing", type: "line", source: yearRouteSourceId, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FBF7EF", "line-width": 4.3, "line-opacity": 0.94, "line-dasharray": [1.15, 1.55] } });
        map.addLayer({ id: "journal-year-route", type: "line", source: yearRouteSourceId, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["coalesce", ["get", "color"], "#8D624C"], "line-width": 2.25, "line-opacity": 0.98, "line-dasharray": [1.15, 1.55] } });
        map.addLayer({ id: "route-flight-icons", type: "symbol", source: flightSourceId, layout: { "icon-image": ["get", "iconImage"], "icon-size": 1.12, "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "visited-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.36, 3, 1.56], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "lived-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "lived"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.42, 3, 1.62], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "related-journey-halo", type: "circle", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 12, 3, 15], "circle-color": "rgba(251, 246, 238, 0.58)", "circle-stroke-color": ["coalesce", ["get", "accentColor"], "#B47A67"], "circle-stroke-opacity": 0.16, "circle-stroke-width": 0.9 } });
        map.addLayer({ id: "related-journey-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.56, 3, 1.72], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "selected-point-outer-ring", type: "circle", source: pointSourceId, filter: ["==", ["get", "selected"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 16, 3, 18], "circle-color": ["coalesce", ["get", "accentColor"], "#7E5146"], "circle-opacity": 0.16, "circle-blur": 0.16 } });
        map.addLayer({ id: "selected-point-inner-ring", type: "circle", source: pointSourceId, filter: ["==", ["get", "selected"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 10, 3, 11.5], "circle-color": "#FBF7EF", "circle-stroke-color": ["coalesce", ["get", "accentColor"], "#7E5146"], "circle-stroke-width": 1.8, "circle-stroke-opacity": 0.82 } });
        map.addLayer({ id: "selected-point-center", type: "circle", source: pointSourceId, filter: ["==", ["get", "selected"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 5.5, 3, 6.5], "circle-color": ["coalesce", ["get", "accentColor"], "#7E5146"], "circle-stroke-color": "#FBF7EF", "circle-stroke-width": 1.2 } });
        map.addLayer({ id: "selected-icon", type: "symbol", source: pointSourceId, filter: ["==", ["get", "selected"], true], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.62, 3, 1.82], "icon-allow-overlap": true } });
        map.addLayer({ id: "visited-country-labels", type: "symbol", source: visitedCountrySourceId, minzoom: 1.05, layout: { "text-field": ["get", "country"], "text-size": ["interpolate", ["linear"], ["zoom"], 1.05, 8.5, 3, 10], "text-offset": [0, 2.2], "text-anchor": "top", "text-allow-overlap": false }, paint: { "text-color": "#756B61", "text-halo-color": "#FFFDF8", "text-halo-width": 1.1, "text-opacity": 0.76 } });
        map.addLayer({ id: "visited-place-labels", type: "symbol", source: pointSourceId, filter: ["!=", ["get", "selected"], true], minzoom: 2.15, layout: { "text-field": ["get", "title"], "text-size": ["interpolate", ["linear"], ["zoom"], 2.15, 8.5, 4.5, 10], "text-offset": [0, 2.5], "text-anchor": "top", "text-allow-overlap": false }, paint: { "text-color": ["coalesce", ["get", "accentDark"], "#3B342E"], "text-halo-color": "#FFFDF8", "text-halo-width": 1.05, "text-opacity": 0.8 } });
        map.addLayer({ id: "story-preview-dots", type: "circle", source: storyPreviewSourceId, filter: ["!", ["has", "point_count"]], minzoom: 3.3, paint: { "circle-radius": ["case", ["==", ["get", "selected"], true], 8, ["==", ["get", "featured"], true], 6, 5], "circle-color": "rgba(255,253,249,0.78)", "circle-stroke-color": ["coalesce", ["get", "accentColor"], "#8D624C"], "circle-stroke-width": ["case", ["==", ["get", "selected"], true], 1.6, 1], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3.3, 0.42, 4.8, 0.78] } });
        map.addLayer({ id: "story-preview-images", type: "symbol", source: storyPreviewSourceId, filter: ["all", ["!", ["has", "point_count"]], ["!=", ["get", "previewImage"], ""]], minzoom: 5.2, layout: { "icon-image": ["get", "previewImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 5.2, 0.34, 6.5, 0.48], "icon-offset": [0, -2.8], "icon-allow-overlap": false } });
        map.addLayer({ id: "selected-place-labels", type: "symbol", source: pointSourceId, filter: ["any", ["==", ["get", "selected"], true], ["==", ["get", "relatedToSelectedJourney"], true]], layout: { "text-field": ["get", "title"], "text-size": 10.5, "text-offset": [1.42, 0], "text-anchor": "left", "text-allow-overlap": false }, paint: { "text-color": ["coalesce", ["get", "accentDark"], "#2c241f"], "text-halo-color": "#FBF7EF", "text-halo-width": 1, "text-opacity": 0.82 } });
        map.addLayer({ id: "story-preview-labels", type: "symbol", source: storyPreviewSourceId, filter: ["all", ["!", ["has", "point_count"]], ["any", ["==", ["get", "selected"], true], ["==", ["get", "featured"], true]]], minzoom: 4.2, layout: { "text-field": ["get", "title"], "text-size": ["interpolate", ["linear"], ["zoom"], 4.2, 9, 5.8, 11], "text-offset": [0, 1.25], "text-anchor": "top", "text-allow-overlap": false }, paint: { "text-color": ["coalesce", ["get", "accentDark"], "#2C241F"], "text-halo-color": "#FBF7EF", "text-halo-width": 1, "text-opacity": 0.78 } });
        const clickableLayers = ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon", "story-preview-images", "story-preview-dots", "story-preview-labels"];
        clickableLayers.forEach((layerId) => {
          map.on("click", layerId, (event) => {
            const entryId = event.features?.[0]?.properties?.entryId;
            const selectedEntry = latestPlacesRef.current.find((place) => place.id === entryId);
            if (selectedEntry) latestOnSelectRef.current(selectedEntry);
          });
          map.on("mouseenter", layerId, () => setCursor(map, "pointer"));
          map.on("mouseleave", layerId, () => setCursor(map, ""));
        });
        map.on("moveend", () => positionSelectedPreview(map));
        map.on("resize", () => positionSelectedPreview(map));
        applyLatestMapData(map);
        publishMapDiagnostics();
        // Preserve the opening world-atlas framing; later selections still focus.
        lastCameraSelectionRef.current = latestSelectedPlaceRef.current.id;
        positionSelectedPreview(map);
        setMapReady(true);
      })();
    });
    map.on("styledata", () => {
      scheduleBaseMapStyle();
      applyLatestMapData(map);
    });
    mapRef.current = map;
    return () => {
      window.clearTimeout(styleCleanupTimer);
      map.remove();
      mapRef.current = null;
    };
  }, [applyLatestMapData, positionSelectedPreview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    void registerStoryPreviewImages(map, meaningfulStories);
  }, [mapReady, meaningfulStories]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    applyLatestMapData(map);
    if (import.meta.env.DEV && shouldDebugMap()) {
      console.info("Journal Map debug", {
        selectedEntryId: selectedPlace.id,
        activeYear,
        pointFeatureCount: pointData.features.length,
        yearRouteCoordinateCount: 0,
        selectedJourneyCoordinateCount: yearRouteData.features[0]?.geometry.coordinates.length ?? 0,
        flightFeatureCount: flightData.features.length,
        storyPreviewFeatureCount: storyPreviewData.features.length,
        selectedJourneyCoordinates: yearRouteData.features[0]?.geometry.coordinates ?? [],
        routeSources: { year: Boolean(map.getSource(yearRouteSourceId)), flights: Boolean(map.getSource(flightSourceId)) },
        iconLayers: ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon"].every((id) => Boolean(map.getLayer(id))),
      });
    }
  }, [applyLatestMapData, mapReady, pointData, yearRouteData, flightData, storyPreviewData, selectedPlace.id, selectedYear, activeYear]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const selectionChanged = lastCameraSelectionRef.current !== selectedPlace.id;
    if (!selectionChanged && lastSelectionRevisionRef.current === selectionRevision) return;
    lastCameraSelectionRef.current = selectedPlace.id;
    lastSelectionRevisionRef.current = selectionRevision;
    setPreviewOpen(true);
    applyLatestMapData(map);
    if (selectionChanged) {
      focusSelectedPlace(map, selectedPlace, 650);
      map.once("moveend", () => positionSelectedPreview(map));
    } else {
      positionSelectedPreview(map);
    }
  }, [applyLatestMapData, selectedPlace, selectionRevision, mapReady, positionSelectedPreview]);

  const selectedStory = selectedPlace.story;
  const selectedPreviewImage = selectedStory?.previewImage ?? selectedStory?.coverImage ?? selectedPlace.photo;
  const selectedPreviewText = selectedStory?.previewSummary ?? selectedStory?.dek ?? selectedPlace.note;

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />
      {previewOpen ? (
        <aside className="map-selected-preview-overlay" style={previewPosition ? { left: previewPosition.left, top: previewPosition.top, right: "auto", bottom: "auto" } : undefined} aria-label={`${selectedPlace.name} story preview`}>
          <button className="map-selected-preview-close" type="button" onPointerDown={(event: Event) => event.stopPropagation()} onClick={(event: Event) => { event.preventDefault(); event.stopPropagation(); setPreviewOpen(false); }} aria-label="Close story preview">×</button>
          <div className="map-selected-preview">
            {selectedPreviewImage ? <img src={selectedPreviewImage} alt="" /> : null}
            <div>
              <small>{selectedPlace.dateLabel}</small>
              <strong>{selectedStory?.title ?? selectedPlace.name}</strong>
              <em>{selectedPlace.country}</em>
              {selectedPreviewText ? <p>{selectedPreviewText}</p> : null}
              <a href={selectedStory ? `/stories/${selectedStory.slug}` : "#stories"}>Read story →</a>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
