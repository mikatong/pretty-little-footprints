import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapIconType, MapPoint, Place } from "../types";
import { getPlaceAccent, getPlaceIconType, isMajorDestination, isWorldAtlasDestination, type PlaceAccent } from "../placePresentation";
import { placeIconKeyByPlaceId } from "../placeIconRegistry";
import { getStartTime } from "../storyUtils";
import { StoryPreviewImage } from "./StoryPreviewImage";

type MapViewProps = {
  places: Place[];
  selectedPlace: Place;
  selectionRevision: number;
  activeYear: string;
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
  majorDestination: boolean;
  worldDestination: boolean;
  secondaryDestination: boolean;
  coordinates: [number, number];
};

const mapStyle = "https://tiles.openfreemap.org/styles/positron";
const worldCenter: [number, number] = [8, 12];
const worldBounds: [[number, number], [number, number]] = [
  [-179.5, -72],
  [179.5, 82],
];
const pointSourceId = "map-points";
const yearRouteSourceId = "journal-year-route";
const flightSourceId = "journal-route-flights";
const debugMapQueryParam = "debugMap";
const debugJourneyMap = false;
const appMapSources = new Set([
  pointSourceId,
  yearRouteSourceId,
  flightSourceId,
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
const routePalette = [...new Set(Object.values(yearRouteColors))];

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

const getIconSvg = (iconType: MapIconType, accent: PlaceAccent, state: "lived" | "visited" | "selected") => {
  const lived = state === "lived";
  const selected = state === "selected";
  const stroke = selected ? accent.dark : lived ? accent.dark : accent.primary;
  const opacity = selected ? "0.98" : "0.88";
  // A light, stroke-only atlas language keeps every destination airy at small
  // sizes. The selected destination changes tone, never into a filled badge.
  const common = `fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  const line = `fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
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
    fitzRoy: `<path ${common} d="M7 36 16 20l4 7 8-18 4 13 4-5 6 19z"/><path ${line} d="M7 39c8 2 20 2 35 0M28 9l1 15 4-6M16 20l3 12 4-4"/>`,
    machuPicchu: `<path ${common} d="M8 36h32v-5H12v5z"/><path ${line} d="M12 31h24v-5H16M16 26h16v-5H20M20 21h8v-5M15 31v5M21 26v5M27 21v10M33 26v10M24 12v4M20 12h8"/>`,
    iceberg: `<path ${common} d="M10 35 22 12l6 11 4-5 7 17z"/><path ${line} d="M13 36c6 3 16 3 23 0M22 12l1 14 5-3"/>`,
    snow: `<path ${line} d="M24 10v28M14 17l20 14M34 17 14 31M16 24h16"/><circle cx="24" cy="24" r="3" fill="none" stroke="${stroke}" stroke-width="1.5"/>`,
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
    cnTower: `<path ${line} d="M24 9v28M18 22h12M20 26h8M21 14h6"/><circle cx="24" cy="20" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>`,
    spaceNeedle: `<path ${line} d="M24 11v25M15 20h18M18 17h12M19 36h10M18 26l12 10M30 26 18 36"/>`,
    neon: `<path ${common} d="M12 17h24v12H12z"/><path ${line} d="M16 23h16M18 29v7M30 29v7"/>`,
    landmark: `<path ${common} d="M14 36h20l-3-15H17z"/><path ${line} d="M24 12v24M18 12h12M17 20h14"/>`,
    chengdu: `<path ${line} d="M7 36h34M17 36V26h14v10M15 26h18M18 22h12M16 19h16M20 16h8M20 36v-8h8v8M10 35V13M13 35V18M37 35V13M34 35V18M7 17l3-5 3 5M10 22l-4-3M10 26l5-3M13 16l4-4M13 22l4 2M37 17l-3-5-3 5M37 22l4-3M37 26l-5-3M34 16l-4-4M34 22l-4 2"/>`,
    beijing: `<path ${line} d="M8 36h32M12 36V23h24v13M10 23h28M13 20h22M11 17h26M16 14h16M18 11h12M9 23l5-4M39 23l-5-4M14 28h4M22 28h4M30 28h4"/>`,
    shanghai: `<path ${line} d="M7 36h34M12 36V25h5v11M19 36V17h5v19M27 36V10h4v26M33 36V22h5v14M29 10V6M27 16h8M26 22h10M25 29h12"/>`,
    seoul: `<path ${line} d="M6 36h36M10 33 18 25l4 5 5-12 11 15M23 18V8M20 12h6M19 16h8M24 8V5"/>`,
    tokyo: `<path ${line} d="M10 36h28M24 36V11M20 36l4-25 4 25M17 27h14M19 21h10M22 15h4M24 11V6M13 36c2-4 4-5 6-5M35 36c-2-4-4-5-6-5"/>`,
    bali: `<path ${line} d="M7 36h34M12 36V24h24v12M10 24h28M14 20h20M17 16h14M20 12h8M12 24l5-4M36 24l-5-4M18 29h3M23 29h3M28 29h3M39 34c-3-7-3-14 0-20M39 18c3-2 5-1 6 1M39 20c-3-2-5-1-6 1"/>`,
    antarctica: `<path ${common} d="M6 35 15 20l6 7 7-17 14 25z"/><path ${line} d="M6 39c8 2 26 2 36 0M10 42c8-2 20-2 29 0M15 20l3 14 5-4M28 10l1 18 5-7"/><path ${common} d="M31 37c-2-3-2-8 1-11 2-2 5-2 7 1 2 3 1 8-1 10z"/><path ${line} d="M32 30h6M35 26v11M31 37l-2 2M38 37l2 2"/>`,
    lima: `<path ${line} d="M7 36h34M12 36V22h24v14M9 22h30M13 18h22M16 14h16M19 10h10M16 25v7M22 25v7M28 25v7M34 25v7M24 22v-8M21 18h6"/>`,
    newYork: `<path ${line} d="M7 36h34M11 36V22h5v14M18 36V14h6v22M26 36V8h5v28M33 36V19h5v17M28 8V5M25 20h7M17 22h7M10 27h6"/>`,
    bayArea: `<path ${line} d="M5 36h38M8 35c5-13 10-13 16 0M24 35c5-13 10-13 16 0M10 28h28M13 24v12M35 24v12M18 20h12M20 20v5M28 20v5"/>`,
    vancouver: `<path ${line} d="M6 36h36M11 36V25h8v11M21 36V20h7v16M30 36V27h7v9M14 25V9M11 12h6M10 16h8M32 27V13M29 17h6M28 21h8"/>`,
    iceland: `<path ${line} d="M5 36h38M8 33l8-14 5 8 6-16 13 22M12 36c5 2 18 2 25 0M16 19l2 8M27 11l1 16M33 23l2 10"/>`,
    default: `<path ${common} d="M24 10c7 0 12 5 12 11 0 7-12 17-12 17S12 28 12 21c0-6 5-11 12-11z"/><circle cx="24" cy="21" r="3.5" fill="none" stroke="${stroke}" stroke-width="1.5"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 48 48">${bg}${shapes[iconType]}</svg>`;
};

const getFlightSvg = (color: string) => {
  // A compact, solid top-down aircraft facing east. MapLibre rotates the asset
  // from its local bearing, keeping the silhouette aligned to each route curve.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48"><path d="M44 24c0 1.3-1 2.4-2.4 2.7l-12.5 2.1-7.2 10.1c-.9 1.3-2.7 1.7-4.1.9l-1.4-.8 4.5-11.4-10.7 1.8-3.6 4.5-2.5-.7 1.4-5.5-4.1-1.1v-2.2l4.1-1.1-1.4-5.5 2.5-.7 3.6 4.5 10.7 1.8-4.5-11.4 1.4-.8c1.4-.8 3.2-.4 4.1.9L29.1 19l12.5 2.1C43 21.5 44 22.7 44 24z" fill="${color}"/></svg>`;
};

const loadSvgImage = (svg: string, size = 48) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(size, size);
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
  await Promise.all(routePalette.map(async (color) => {
    const name = flightIconName(color);
    if (map.hasImage(name)) return;
    map.addImage(name, await loadSvgImage(getFlightSvg(color), 64), { pixelRatio: 2 });
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
      majorDestination: isMajorDestination(place, point),
      worldDestination: isWorldAtlasDestination(place, point),
      secondaryDestination: Boolean(place.featured || place.hasStory || place.category === "lived"),
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
        majorDestination: point.majorDestination,
        worldDestination: point.worldDestination,
        secondaryDestination: point.secondaryDestination,
        selected: point.entryId === selectedPlace.id,
        relatedToSelectedJourney: point.entryId === selectedPlace.id && selectedPointIds.has(point.id),
      },
      geometry: { type: "Point", coordinates: point.coordinates },
    }))),
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
  const steps = distanceKm > 6000 ? 30 : distanceKm > 2500 ? 24 : distanceKm > 700 ? 18 : 12;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const direction = segmentIndex % 2 === 0 ? 1 : -1;
  if (distanceKm > 6000) {
    // Long-haul legs use two quadratics with a shared tangent at their ocean
    // midpoint. This avoids a mechanical diagonal while remaining deterministic.
    const midpoint: [number, number] = [
      (from[0] + to[0]) / 2 + (-dy / length) * 16 * direction,
      Math.max(-72, Math.min(82, (from[1] + to[1]) / 2 + (dx / length) * 16 * direction)),
    ];
    const tangent = Math.min(length * 0.22, 15);
    const controlA: [number, number] = [midpoint[0] - (dx / length) * tangent, midpoint[1] - (dy / length) * tangent];
    const controlB: [number, number] = [midpoint[0] + (dx / length) * tangent, midpoint[1] + (dy / length) * tangent];
    const sampleQuadratic = (start: [number, number], control: [number, number], end: [number, number], count: number) =>
      Array.from({ length: count + 1 }, (_, step) => {
        const t = step / count;
        const inv = 1 - t;
        return [
          inv * inv * start[0] + 2 * inv * t * control[0] + t * t * end[0],
          inv * inv * start[1] + 2 * inv * t * control[1] + t * t * end[1],
        ] as [number, number];
      });
    const first = sampleQuadratic(from, controlA, midpoint, steps / 2);
    return [...first, ...sampleQuadratic(midpoint, controlB, to, steps / 2).slice(1)];
  }
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

// Route strokes deliberately stop short of each destination. This keeps the
// landmark illustration centered on its location without a line cutting
// through the artwork, even when a journey arrives and departs from one point.
const getTrimmedRouteSegment = (from: [number, number], to: [number, number], segmentIndex: number, endpointGapKm = 260) => {
  const curve = getCurvedSegment(from, to, segmentIndex);
  if (curve.length < 3 || getDistanceKm(from, to) <= endpointGapKm * 2) return null;

  let startIndex = 0;
  let startDistance = 0;
  while (startIndex < curve.length - 1 && startDistance < endpointGapKm) {
    startDistance += getDistanceKm(curve[startIndex], curve[startIndex + 1]);
    startIndex += 1;
  }

  let endIndex = curve.length - 1;
  let endDistance = 0;
  while (endIndex > startIndex && endDistance < endpointGapKm) {
    endDistance += getDistanceKm(curve[endIndex], curve[endIndex - 1]);
    endIndex -= 1;
  }

  return endIndex - startIndex >= 1 ? curve.slice(startIndex, endIndex + 1) : null;
};

const getSegmentColor = (year: string, segmentIndex: number) => {
  const yearColor = yearRouteColors[year] ?? "#8D624C";
  const startIndex = routePalette.indexOf(yearColor);
  return routePalette[(Math.max(startIndex, 0) + segmentIndex) % routePalette.length];
};

const getFlightFeatures = (coordinates: [number, number][], year: string) => coordinates.slice(0, -1).flatMap((from, index) => {
  const to = coordinates[index + 1];
  // A plane belongs to every segment that has sufficient visual breathing room,
  // not only to transcontinental legs.
  const distanceKm = getDistanceKm(from, to);
  if (distanceKm < 260) return [];
  const curve = getCurvedSegment(from, to, index);
  const midpoint = curve[Math.floor(curve.length / 2)];
  const earlier = curve[Math.max(0, Math.floor(curve.length * 0.46))];
  const later = curve[Math.min(curve.length - 1, Math.ceil(curve.length * 0.54))];
  const color = getSegmentColor(year, index);
  return [{
    type: "Feature" as const,
    // The SVG nose points east at zero rotation; MapLibre bearings are north-up.
    properties: {
      colorKey: color,
      iconImage: flightIconName(color),
      bearing: getBearing(earlier, later) - 90,
      worldFlight: distanceKm >= 3500,
      regionalFlight: distanceKm >= 900 || index % 3 === 0,
    },
    geometry: { type: "Point" as const, coordinates: midpoint },
  }];
});

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
      return coordinates.slice(0, -1).flatMap((from, index) => {
        const routeCoordinates = getTrimmedRouteSegment(from, coordinates[index + 1], index);
        return routeCoordinates ? [{
          type: "Feature" as const,
          properties: { id: `${year}-${index}`, year, color: getSegmentColor(year, index) },
          geometry: { type: "LineString" as const, coordinates: routeCoordinates },
        }] : [];
      });
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
        setPaintIfChanged(map, layer.id, "fill-outline-color", "#B8A489");
      } else if (/(land|earth|country|admin|boundary|park|natural|landcover|landuse)/.test(text)) {
        setPaintIfChanged(map, layer.id, "fill-color", "#F0E6D5");
        setPaintIfChanged(map, layer.id, "fill-opacity", 1);
        if (/(land|earth|natural)/.test(text)) {
          setPaintIfChanged(map, layer.id, "fill-outline-color", "#C0AE95");
        }
      }
      return;
    }
    if (layer.type === "line") {
      if (/(boundary|admin|country|coast)/.test(text)) {
        const coastline = /(coast|shore|land[_ -]?edge)/.test(text);
        // The atlas reads by continent. Only the outer land edge remains;
        // country and administrative subdivisions stay out of the composition.
        setPaintIfChanged(map, layer.id, "line-color", coastline ? "#B8A489" : "#C0AE95");
        setPaintIfChanged(map, layer.id, "line-opacity", coastline ? 0.98 : 0);
        setPaintIfChanged(map, layer.id, "line-width", coastline ? 1.12 : 0.82);
      } else if (/(road|rail|transport|ferry)/.test(text)) {
        setPaintIfChanged(map, layer.id, "line-opacity", 0);
      }
      return;
    }
    if (layer.type === "symbol") {
      if (/(marine|ocean|sea|water)/.test(text)) {
        setPaintIfChanged(map, layer.id, "text-color", "#2F73B5");
        setPaintIfChanged(map, layer.id, "text-halo-color", "#FBF7EF");
        setPaintIfChanged(map, layer.id, "text-halo-width", 0.7);
        setPaintIfChanged(map, layer.id, "text-opacity", 0.86);
      }
    }
  } catch {
    // Third-party styles vary; ignore unsupported paint properties.
  }
};

const runtimeMapDiagnostics = (map: maplibregl.Map) => {
  const layers = map.getStyle().layers ?? [];
  const layerIds = new Set(layers.map((layer) => layer.id));
  const requiredLayers = ["journal-year-route", "route-flight-icons-world", "visited-place-labels"];
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

export function MapView({ places, selectedPlace, selectionRevision, activeYear, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastCameraSelectionRef = useRef<string | null>(null);
  const lastSelectionRevisionRef = useRef(selectionRevision);
  const [mapReady, setMapReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewPosition, setPreviewPosition] = useState<{ left: number; top: number } | null>(null);
  const selectedYear = getStartYear(selectedPlace);
  const pointData = useMemo(() => getPointFeatureCollection(places, selectedPlace), [places, selectedPlace]);
  // The selected record is canonical: routes and aircraft always use its year.
  const yearRouteData = useMemo(() => getYearRouteFeatureCollection(places, selectedYear), [places, selectedYear]);
  const flightData = useMemo(() => getFlightFeatureCollection(places, selectedYear), [places, selectedYear]);
  const latestSelectedPlaceRef = useRef(selectedPlace);
  const latestPlacesRef = useRef(places);
  const latestOnSelectRef = useRef(onSelect);
  const latestPointDataRef = useRef(pointData);
  const latestYearRouteDataRef = useRef(yearRouteData);
  const latestFlightDataRef = useRef(flightData);
  latestSelectedPlaceRef.current = selectedPlace;
  latestPlacesRef.current = places;
  latestOnSelectRef.current = onSelect;
  latestPointDataRef.current = pointData;
  latestYearRouteDataRef.current = yearRouteData;
  latestFlightDataRef.current = flightData;

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
    const yearRouteSource = map.getSource(yearRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    const flightSource = map.getSource(flightSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!pointSource || !yearRouteSource || !flightSource) return false;
    pointSource.setData(latestPointDataRef.current as never);
    yearRouteSource.setData(latestYearRouteDataRef.current as never);
    flightSource.setData(latestFlightDataRef.current as never);
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
    let installingAppLayers = false;
    const installAppLayers = async () => {
      if (installingAppLayers || map.getSource(pointSourceId)) return;
      installingAppLayers = true;
      try {
        styleBaseMap(map);
        window.setTimeout(() => styleBaseMap(map), 250);
        await registerMapIcons(map, latestPlacesRef.current);
        map.addSource(yearRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(flightSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(pointSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addLayer({ id: "journal-year-route-casing", type: "line", source: yearRouteSourceId, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#FFFDF8", "line-width": 3.35, "line-opacity": 0.94, "line-dasharray": [1.1, 1.35] } });
        map.addLayer({ id: "journal-year-route", type: "line", source: yearRouteSourceId, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": ["coalesce", ["get", "color"], "#8D624C"], "line-width": 1.72, "line-opacity": 1, "line-dasharray": [1.1, 1.35] } });
        map.addLayer({ id: "route-flight-icons-world", type: "symbol", source: flightSourceId, filter: ["==", ["get", "worldFlight"], true], layout: { "icon-image": ["get", "iconImage"], "icon-size": 0.87, "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "route-flight-icons-regional", type: "symbol", source: flightSourceId, minzoom: 1.85, filter: ["all", ["!=", ["get", "worldFlight"], true], ["==", ["get", "regionalFlight"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": 0.87, "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "route-flight-icons-detail", type: "symbol", source: flightSourceId, minzoom: 3.3, filter: ["all", ["!=", ["get", "worldFlight"], true], ["!=", ["get", "regionalFlight"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": 0.87, "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        // The opening atlas is intentionally representative: close destinations
        // enter only at deeper zoom, then still respect symbol collisions.
        map.addLayer({ id: "visited-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!", ["get", "relatedToSelectedJourney"]], ["==", ["get", "worldDestination"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.68, 2.3, 1.888], "icon-allow-overlap": false, "icon-ignore-placement": false, "symbol-sort-key": 3 } });
        map.addLayer({ id: "visited-secondary-icons", type: "symbol", source: pointSourceId, minzoom: 2.35, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!", ["get", "relatedToSelectedJourney"]], ["==", ["get", "majorDestination"], true], ["!", ["get", "worldDestination"]]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 2.35, 1.472, 4.2, 1.696], "icon-allow-overlap": false, "icon-ignore-placement": false, "symbol-sort-key": 2 } });
        map.addLayer({ id: "visited-detail-icons", type: "symbol", source: pointSourceId, minzoom: 3.3, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!", ["get", "relatedToSelectedJourney"]], ["!", ["get", "majorDestination"]]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 3.3, 1.184, 6.2, 1.504], "icon-allow-overlap": false, "icon-ignore-placement": false, "symbol-sort-key": ["case", ["==", ["get", "secondaryDestination"], true], 1, 0] } });
        map.addLayer({ id: "lived-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "lived"], ["!=", ["get", "selected"], true], ["!", ["get", "relatedToSelectedJourney"]], ["==", ["get", "worldDestination"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.728, 2.3, 1.952], "icon-allow-overlap": false, "icon-ignore-placement": false, "symbol-sort-key": 3 } });
        map.addLayer({ id: "lived-secondary-icons", type: "symbol", source: pointSourceId, minzoom: 2.35, filter: ["all", ["==", ["get", "locationType"], "lived"], ["!=", ["get", "selected"], true], ["!", ["get", "relatedToSelectedJourney"]], ["!", ["get", "worldDestination"]]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 2.35, 1.44, 4.2, 1.664], "icon-allow-overlap": false, "icon-ignore-placement": false, "symbol-sort-key": 2 } });
        map.addLayer({ id: "related-journey-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.84, 3, 2.08], "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "selected-icon", type: "symbol", source: pointSourceId, filter: ["==", ["get", "selected"], true], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.952, 3, 2.208], "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "visited-place-labels", type: "symbol", source: pointSourceId, filter: ["all", ["!=", ["get", "selected"], true], ["==", ["get", "worldDestination"], true]], minzoom: 2.9, layout: { "text-field": ["get", "title"], "text-size": ["interpolate", ["linear"], ["zoom"], 2.9, 8.5, 4.8, 10], "text-offset": [0, 2.35], "text-anchor": "top", "text-allow-overlap": false }, paint: { "text-color": ["coalesce", ["get", "accentDark"], "#3B342E"], "text-halo-color": "#FFFDF8", "text-halo-width": 1.05, "text-opacity": 0.8 } });
        map.addLayer({ id: "selected-place-labels", type: "symbol", source: pointSourceId, minzoom: 2.2, filter: ["==", ["get", "selected"], true], layout: { "text-field": ["get", "title"], "text-size": 10.5, "text-offset": [1.42, 0], "text-anchor": "left", "text-allow-overlap": true, "text-ignore-placement": true }, paint: { "text-color": ["coalesce", ["get", "accentDark"], "#2c241f"], "text-halo-color": "#FBF7EF", "text-halo-width": 1, "text-opacity": 0.82 } });
        const clickableLayers = ["visited-icons", "visited-secondary-icons", "visited-detail-icons", "lived-icons", "lived-secondary-icons", "related-journey-icons", "selected-icon"];
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
      } finally {
        installingAppLayers = false;
      }
    };
    map.on("load", () => {
      void installAppLayers();
    });
    map.on("style.load", () => {
      // MapLibre discards app sources and layers on setStyle(). Reinstall them
      // after every style load so endpoint icons never vanish behind the basemap.
      if (!map.getSource(pointSourceId)) void installAppLayers();
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
    applyLatestMapData(map);
    if (import.meta.env.DEV && shouldDebugMap()) {
      console.info("Journal Map debug", {
        selectedEntryId: selectedPlace.id,
        activeYear,
        pointFeatureCount: pointData.features.length,
        yearRouteCoordinateCount: 0,
        selectedJourneyCoordinateCount: yearRouteData.features[0]?.geometry.coordinates.length ?? 0,
        flightFeatureCount: flightData.features.length,
        selectedJourneyCoordinates: yearRouteData.features[0]?.geometry.coordinates ?? [],
        routeSources: { year: Boolean(map.getSource(yearRouteSourceId)), flights: Boolean(map.getSource(flightSourceId)) },
        iconLayers: ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon"].every((id) => Boolean(map.getLayer(id))),
      });
    }
  }, [applyLatestMapData, mapReady, pointData, yearRouteData, flightData, selectedPlace.id, selectedYear, activeYear]);

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
            {selectedPreviewImage ? <StoryPreviewImage place={selectedPlace} src={selectedPreviewImage} alt="" /> : null}
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
