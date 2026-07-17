import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapIconType, MapPoint, Place } from "../types";
import { getPlaceAccent, getPlaceIconType, type PlaceAccent } from "../placePresentation";
import { getStartTime, hasMeaningfulStoryContent, isStoryImagePath } from "../storyUtils";

type MapViewProps = {
  places: Place[];
  selectedPlace: Place;
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
const yearRouteSourceId = "journal-year-route";
const selectedRouteSourceId = "journey-route-selected";
const flightSourceId = "journal-route-flights";
const storyPreviewSourceId = "journal-story-previews";
const debugMapQueryParam = "debugMap";
const debugJourneyMap = false;
const appMapSources = new Set([
  pointSourceId,
  yearRouteSourceId,
  selectedRouteSourceId,
  flightSourceId,
  storyPreviewSourceId,
]);
const iconTypes: MapIconType[] = [
  "home",
  "city",
  "academic",
  "temple",
  "palace",
  "pagoda",
  "tower",
  "bridge",
  "mountain",
  "fitzRoy",
  "machuPicchu",
  "iceberg",
  "snow",
  "forest",
  "cypress",
  "coast",
  "tropical",
  "palm",
  "splitGate",
  "desert",
  "cactus",
  "waterfall",
  "eiffel",
  "bigBen",
  "cnTower",
  "spaceNeedle",
  "neon",
  "landmark",
  "default",
];

const iconAccents: PlaceAccent[] = [
  { key: "beijing", primary: "#A34F3F", dark: "#6D332B", pale: "#E9C8BE" },
  { key: "chengdu", primary: "#6F8B63", dark: "#3E6048", pale: "#D5E3D1" },
  { key: "taiyuan", primary: "#A06D48", dark: "#68422D", pale: "#E6CDB8" },
  { key: "tokyo", primary: "#B45D4D", dark: "#743A32", pale: "#EAC7C1" },
  { key: "seoul", primary: "#76619B", dark: "#4E3F6D", pale: "#D8CEE8" },
  { key: "patagonia", primary: "#7A5A99", dark: "#4F3D68", pale: "#D9CDE7" },
  { key: "canggu", primary: "#5F8A69", dark: "#3E6048", pale: "#CFE0D1" },
  { key: "antarctica", primary: "#5E8EAA", dark: "#3D657A", pale: "#D6E5ED" },
  { key: "iceland", primary: "#6B92B2", dark: "#405F78", pale: "#D5E2EC" },
  { key: "big-sur", primary: "#537B5C", dark: "#35513C", pale: "#CADACC" },
  { key: "peru", primary: "#9B8650", dark: "#6A5B37", pale: "#E2D8B6" },
  { key: "ann-arbor", primary: "#B18A48", dark: "#74582F", pale: "#E9D9B8" },
  { key: "waterloo", primary: "#477E82", dark: "#2F595D", pale: "#C8DEDF" },
  { key: "mountain-view", primary: "#718B73", dark: "#475E49", pale: "#D4E0D2" },
  { key: "hawaii", primary: "#568D7A", dark: "#386354", pale: "#CCE1D9" },
  { key: "academic", primary: "#6D7F99", dark: "#46566E", pale: "#D4DAE4" },
  { key: "asia", primary: "#6F9277", dark: "#3E6048", pale: "#CFE0D1" },
  { key: "europe", primary: "#8D624C", dark: "#5B3C31", pale: "#E7DED2" },
  { key: "north-america", primary: "#7F9FB2", dark: "#405F78", pale: "#D5E2EC" },
  { key: "southwest", primary: "#B47A43", dark: "#7A4B2B", pale: "#EAD1B4" },
  { key: "tropical", primary: "#5F8A69", dark: "#3E6048", pale: "#CFE0D1" },
  { key: "forest", primary: "#537B5C", dark: "#35513C", pale: "#CADACC" },
  { key: "default", primary: "#8D624C", dark: "#5B3C31", pale: "#E7DED2" },
];

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
  const fill = selected ? accent.pale : lived ? accent.pale : "#FFFDFC";
  const bgFill = selected ? "#FBF5EC" : "rgba(255,253,249,0.78)";
  const opacity = selected ? "0.98" : lived ? "0.82" : "0.76";
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  const line = `fill="none" stroke="${stroke}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"`;
  const bg = `<circle cx="24" cy="24" r="${selected ? 18.5 : 16}" fill="${bgFill}" stroke="${accent.pale}" stroke-width="1" opacity="${selected ? "0.9" : "0.58"}"/>`;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${bg}${shapes[iconType]}</svg>`;
};

const getFlightSvg = (color: string) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><path d="M7 19 31 7l-7 22-6-8-8 4 4-7z" fill="#FFFDFC" stroke="${color}" stroke-width="1.65" stroke-linejoin="round" opacity="0.86"/><path d="m18 21 13-14" fill="none" stroke="${color}" stroke-width="1.25" stroke-linecap="round" opacity="0.76"/></svg>`;
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

const registerMapIcons = async (map: maplibregl.Map) => {
  await Promise.all(iconTypes.flatMap((iconType) =>
    iconAccents.flatMap((accent) => (["lived", "visited", "selected"] as const).map(async (state) => {
      const name = iconImageName(iconType, accent.key, state);
      if (map.hasImage(name)) return;
      const image = await loadSvgImage(getIconSvg(iconType, accent, state));
      map.addImage(name, image, { pixelRatio: 2 });
    }))
  ));
  await Promise.all([...Object.entries(yearRouteColors), ...iconAccents.map((accent) => [accent.key, accent.primary] as const)].map(async ([key, color]) => {
    const name = flightIconName(key);
    if (map.hasImage(name)) return;
    const image = await loadSvgImage(getFlightSvg(color), 36);
    map.addImage(name, image, { pixelRatio: 2 });
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
    const iconType = getPlaceIconType(place, point);
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

const getFlightFeatures = (coordinates: [number, number][], colorKey: string) => {
  return coordinates.slice(0, -1).flatMap((from, index) => {
    const to = coordinates[index + 1];
    const distanceKm = getDistanceKm(from, to);
    if (distanceKm < 850) return [];
    const curve = getCurvedSegment(from, to, index);
    const midpoint = curve[Math.floor(curve.length / 2)];
    const afterMidpoint = curve[Math.min(curve.length - 1, Math.floor(curve.length / 2) + 1)];
    return [{
      type: "Feature",
      properties: {
        year: Number(colorKey) || 0,
        segmentId: `${colorKey}-${index}`,
        routeType: "flight",
        colorKey,
        iconImage: flightIconName(colorKey),
        bearing: getBearing(midpoint, afterMidpoint),
      },
      geometry: { type: "Point", coordinates: midpoint },
    }];
  });
};

const getRouteCoordinatesForPlace = (selectedPlace: Place, places: Place[]) => {
  const selectedCoordinates = getValidPoints(selectedPlace).map((point) => point.coordinates);
  const hasExplicitRoute = Boolean(selectedPlace.mapPoints && selectedCoordinates.length >= 2);
  return hasExplicitRoute
    ? selectedCoordinates
    : getChronologicalPlacesForYear(places, getStartYear(selectedPlace))
      .map(getPrimaryPoint)
      .filter((point): point is ValidPoint => Boolean(point))
      .map((point) => point.coordinates);
};

const fitRouteOrPoint = (map: maplibregl.Map, selectedPlace: Place, places: Place[], duration = 620) => {
  const routeCoordinates = getRouteCoordinatesForPlace(selectedPlace, places);
  if (routeCoordinates.length > 1) {
    const bounds = new maplibregl.LngLatBounds();
    routeCoordinates.forEach((coordinate) => bounds.extend(coordinate));
    map.fitBounds(bounds, {
      padding: window.innerWidth < 700 ? 42 : { top: 92, right: 118, bottom: 132, left: 118 },
      maxZoom: 3.35,
      duration,
      essential: true,
    });
    return;
  }
  const point = getPrimaryPoint(selectedPlace);
  if (point) map.easeTo({ center: point.coordinates, zoom: Math.max(map.getZoom(), 2.15), duration, essential: true });
};

const getYearRouteFeatureCollection = (places: Place[], activeYear: string, selectedPlace: Place) => {
  if (selectedPlace.mapPoints && getValidPoints(selectedPlace).length >= 2) return emptyFeatureCollection;
  const coordinates = getChronologicalPlacesForYear(places, activeYear)
    .map(getPrimaryPoint)
    .filter((point): point is ValidPoint => Boolean(point))
    .map((point) => point.coordinates);
  if (coordinates.length < 2) return emptyFeatureCollection;
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: activeYear, color: yearRouteColors[activeYear] ?? "#8D624C" },
      geometry: { type: "LineString", coordinates: getCurvedRouteCoordinates(coordinates) },
    }],
  };
};

// This is the sole route builder. It derives every active route from the canonical
// selected id, so a popup or a previous map selection can never influence it.
const buildRouteFeatureCollection = (selectedPlaceId: string, places: Place[]) => {
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);
  if (!selectedPlace) return { route: emptyFeatureCollection, flights: emptyFeatureCollection };
  const routeCoordinates = getRouteCoordinatesForPlace(selectedPlace, places);
  if (routeCoordinates.length < 2) return { route: emptyFeatureCollection, flights: emptyFeatureCollection };
  const year = getStartYear(selectedPlace);
  const color = yearRouteColors[year] ?? "#8D624C";
  return {
    route: {
      type: "FeatureCollection" as const,
      features: [{
        type: "Feature",
        properties: { id: selectedPlaceId, year, color },
        geometry: { type: "LineString", coordinates: getCurvedRouteCoordinates(routeCoordinates) },
      }],
    },
    flights: {
      type: "FeatureCollection" as const,
      features: getFlightFeatures(routeCoordinates, year),
    },
  };
};

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
  const keep = /(label_country|country|marine|ocean|sea|water_name|continent)/.test(text);
  const hide = /(label_city|label_town|label_village|label_state|label_other|settlement|locality|neighbour|suburb|hamlet|poi|transit|airport|aerodrome|transportation_name|rail|road|highway|motorway|trunk|primary|secondary|street|path|shield|state|province|admin-1)/.test(text);
  return hide && !keep;
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
      setPaintIfChanged(map, layer.id, "background-color", "#F8F3EA");
      return;
    }
    if (layer.type === "fill") {
      if (/(water|ocean|sea)/.test(text)) {
        setPaintIfChanged(map, layer.id, "fill-color", "#F4EFE6");
        setPaintIfChanged(map, layer.id, "fill-opacity", 0.92);
      } else if (/(land|earth|country|admin|boundary|park|natural|landcover|landuse)/.test(text)) {
        setPaintIfChanged(map, layer.id, "fill-color", "#FBF7EF");
        setPaintIfChanged(map, layer.id, "fill-opacity", 0.84);
      }
      return;
    }
    if (layer.type === "line") {
      if (/(boundary|admin|country)/.test(text)) {
        setPaintIfChanged(map, layer.id, "line-color", "#DDD2C5");
        setPaintIfChanged(map, layer.id, "line-opacity", 0.56);
        setPaintIfChanged(map, layer.id, "line-width", 0.55);
      } else if (/(road|rail|transport|ferry)/.test(text)) {
        setPaintIfChanged(map, layer.id, "line-opacity", 0);
      }
      return;
    }
    if (layer.type === "symbol") {
      if (/(country|continent)/.test(text)) {
        setPaintIfChanged(map, layer.id, "text-color", "#9C938A");
        setPaintIfChanged(map, layer.id, "text-halo-color", "#FBF7EF");
        setPaintIfChanged(map, layer.id, "text-halo-width", 0.9);
        setPaintIfChanged(map, layer.id, "text-opacity", 0.58);
      } else if (/(marine|ocean|sea|water)/.test(text)) {
        setPaintIfChanged(map, layer.id, "text-color", "#6E8AAA");
        setPaintIfChanged(map, layer.id, "text-halo-color", "#F4EFE6");
        setPaintIfChanged(map, layer.id, "text-halo-width", 0.7);
        setPaintIfChanged(map, layer.id, "text-opacity", 0.58);
      }
    }
  } catch {
    // Third-party styles vary; ignore unsupported paint properties.
  }
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

export function MapView({ places, selectedPlace, activeYear, meaningfulStories, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastCameraSelectionRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const selectedStoryImage = selectedPlace.story?.previewImage ?? selectedPlace.story?.coverImage;
  const selectedPreviewText = selectedPlace.story?.previewSummary || selectedPlace.story?.dek || selectedPlace.note;
  const selectedAccent = getPlaceAccent(selectedPlace);
  const pointData = useMemo(() => getPointFeatureCollection(places, selectedPlace), [places, selectedPlace]);
  const activeRouteData = useMemo(() => buildRouteFeatureCollection(selectedPlace.id, places), [places, selectedPlace.id]);
  const yearRouteData = emptyFeatureCollection;
  const selectedRouteData = activeRouteData.route;
  const flightData = activeRouteData.flights;
  const storyPreviewData = useMemo(() => getStoryPreviewFeatureCollection(meaningfulStories, selectedPlace), [meaningfulStories, selectedPlace]);
  const latestSelectedPlaceRef = useRef(selectedPlace);
  const latestPlacesRef = useRef(places);
  const latestMeaningfulStoriesRef = useRef(meaningfulStories);
  const latestOnSelectRef = useRef(onSelect);
  const latestPointDataRef = useRef(pointData);
  const latestYearRouteDataRef = useRef(yearRouteData);
  const latestSelectedRouteDataRef = useRef(selectedRouteData);
  const latestFlightDataRef = useRef(flightData);
  const latestStoryPreviewDataRef = useRef(storyPreviewData);
  latestSelectedPlaceRef.current = selectedPlace;
  latestPlacesRef.current = places;
  latestMeaningfulStoriesRef.current = meaningfulStories;
  latestOnSelectRef.current = onSelect;
  latestPointDataRef.current = pointData;
  latestYearRouteDataRef.current = yearRouteData;
  latestSelectedRouteDataRef.current = selectedRouteData;
  latestFlightDataRef.current = flightData;
  latestStoryPreviewDataRef.current = storyPreviewData;

  const applyLatestMapData = useCallback((map: maplibregl.Map) => {
    const pointSource = map.getSource(pointSourceId) as maplibregl.GeoJSONSource | undefined;
    const yearRouteSource = map.getSource(yearRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    const selectedRouteSource = map.getSource(selectedRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    const flightSource = map.getSource(flightSourceId) as maplibregl.GeoJSONSource | undefined;
    const storyPreviewSource = map.getSource(storyPreviewSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!pointSource || !yearRouteSource || !selectedRouteSource || !flightSource || !storyPreviewSource) return false;
    pointSource.setData(latestPointDataRef.current as never);
    yearRouteSource.setData(latestYearRouteDataRef.current as never);
    selectedRouteSource.setData(latestSelectedRouteDataRef.current as never);
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
    const scheduleBaseMapStyle = () => {
      window.clearTimeout(styleCleanupTimer);
      styleCleanupTimer = window.setTimeout(() => styleBaseMap(map), 160);
    };
    map.setMaxZoom(7.5);
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl({
      onAdd: () => {
        const container = document.createElement("div");
        container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        const button = document.createElement("button");
        button.className = "map-home-control";
        button.type = "button";
        button.setAttribute("aria-label", "Return to selected place");
        button.title = "Return to selected place";
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10h-6v-6h-5v6h-6z"/></svg>';
        button.addEventListener("click", () => {
          applyLatestMapData(map);
          fitRouteOrPoint(map, latestSelectedPlaceRef.current, latestPlacesRef.current, 540);
        });
        container.append(button);
        return container;
      },
      onRemove: () => undefined,
    }, "top-right");
    map.on("load", () => {
      void (async () => {
        styleBaseMap(map);
        window.setTimeout(() => styleBaseMap(map), 250);
        await registerMapIcons(map);
        await registerStoryPreviewImages(map, latestMeaningfulStoriesRef.current);
        map.addSource(yearRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(selectedRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(flightSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(storyPreviewSourceId, {
          type: "geojson",
          data: emptyFeatureCollection,
          cluster: true,
          clusterRadius: 54,
          clusterMaxZoom: 4,
        });
        map.addSource(pointSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addLayer({ id: "journal-year-route-casing", type: "line", source: yearRouteSourceId, paint: { "line-color": "#FBF6EE", "line-width": 3.8, "line-opacity": 0.68, "line-dasharray": [1.4, 2.5] } });
        map.addLayer({ id: "journal-year-route", type: "line", source: yearRouteSourceId, paint: { "line-color": ["coalesce", ["get", "color"], "#8D624C"], "line-width": 1.55, "line-opacity": 0.78, "line-dasharray": [1.4, 2.5] } });
        map.addLayer({ id: "journey-route-line-selected-casing", type: "line", source: selectedRouteSourceId, paint: { "line-color": "#FBF6EE", "line-width": 4.2, "line-opacity": 0.82, "line-dasharray": [1.5, 2.6] } });
        map.addLayer({ id: "journey-route-line-selected", type: "line", source: selectedRouteSourceId, paint: { "line-color": ["coalesce", ["get", "color"], "#9B6657"], "line-width": 1.8, "line-opacity": 0.86, "line-dasharray": [1.5, 2.6] } });
        map.addLayer({ id: "route-flight-icons", type: "symbol", source: flightSourceId, layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.46, 3, 0.62], "icon-rotate": ["get", "bearing"], "icon-rotation-alignment": "map", "icon-allow-overlap": true, "icon-ignore-placement": true } });
        map.addLayer({ id: "story-preview-clusters", type: "circle", source: storyPreviewSourceId, filter: ["has", "point_count"], paint: { "circle-radius": ["step", ["get", "point_count"], 14, 3, 18, 6, 22], "circle-color": "rgba(255,253,249,0.78)", "circle-stroke-color": "#CDBFAF", "circle-stroke-width": 1, "circle-opacity": ["interpolate", ["linear"], ["zoom"], 0.5, 0.5, 3.8, 0.2] } });
        map.addLayer({ id: "story-preview-cluster-count", type: "symbol", source: storyPreviewSourceId, filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 11, "text-allow-overlap": true }, paint: { "text-color": "#2C241F" } });
        map.addLayer({ id: "visited-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.72, 3, 0.94], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "lived-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "lived"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.76, 3, 0.98], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "related-journey-halo", type: "circle", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 12, 3, 15], "circle-color": "rgba(251, 246, 238, 0.58)", "circle-stroke-color": ["coalesce", ["get", "accentColor"], "#B47A67"], "circle-stroke-opacity": 0.16, "circle-stroke-width": 0.9 } });
        map.addLayer({ id: "related-journey-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.02, 3, 1.16], "icon-allow-overlap": false, "icon-ignore-placement": false } });
        map.addLayer({ id: "selected-point-ring", type: "circle", source: pointSourceId, filter: ["==", ["get", "selected"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 15, 3, 18], "circle-color": "rgba(251, 246, 238, 0.72)", "circle-stroke-color": ["coalesce", ["get", "accentColor"], "#7E5146"], "circle-stroke-opacity": 0.24, "circle-stroke-width": 1 } });
        map.addLayer({ id: "selected-icon", type: "symbol", source: pointSourceId, filter: ["==", ["get", "selected"], true], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 1.18, 3, 1.3], "icon-allow-overlap": true } });
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
        map.on("click", "story-preview-clusters", (event) => {
          const clusterId = event.features?.[0]?.properties?.cluster_id;
          const source = map.getSource(storyPreviewSourceId) as maplibregl.GeoJSONSource | undefined;
          if (typeof clusterId !== "number" || !source) return;
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const coordinates = event.features?.[0]?.geometry.type === "Point"
              ? event.features[0].geometry.coordinates as [number, number]
              : undefined;
            if (coordinates) map.easeTo({ center: coordinates, zoom: Math.min(zoom + 0.25, 5.6), duration: 550, essential: true });
          }).catch(() => undefined);
        });
        map.on("mouseenter", "story-preview-clusters", () => setCursor(map, "pointer"));
        map.on("mouseleave", "story-preview-clusters", () => setCursor(map, ""));
        applyLatestMapData(map);
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
  }, [applyLatestMapData]);

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
        selectedJourneyCoordinateCount: selectedRouteData.features[0]?.geometry.coordinates.length ?? 0,
        flightFeatureCount: flightData.features.length,
        storyPreviewFeatureCount: storyPreviewData.features.length,
        selectedJourneyCoordinates: selectedRouteData.features[0]?.geometry.coordinates ?? [],
        routeSources: { year: Boolean(map.getSource(yearRouteSourceId)), selected: Boolean(map.getSource(selectedRouteSourceId)), flights: Boolean(map.getSource(flightSourceId)) },
        iconLayers: ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon"].every((id) => Boolean(map.getLayer(id))),
      });
    }
  }, [applyLatestMapData, mapReady, pointData, yearRouteData, selectedRouteData, flightData, storyPreviewData, selectedPlace.id, activeYear]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (lastCameraSelectionRef.current === selectedPlace.id) return;
    lastCameraSelectionRef.current = selectedPlace.id;
    applyLatestMapData(map);
    fitRouteOrPoint(map, selectedPlace, places, 650);
  }, [applyLatestMapData, selectedPlace, places, mapReady]);

  useEffect(() => {
    setPreviewOpen(true);
  }, [selectedPlace.id]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />
      {previewOpen && hasMeaningfulStoryContent(selectedPlace) && selectedPlace.story ? (
        <article
          className="map-selected-preview map-selected-preview-overlay"
          style={{ "--place-accent": selectedAccent.primary, "--place-accent-pale": selectedAccent.pale } as Record<string, string>}
        >
          <button className="map-selected-preview-close" type="button" aria-label="Close story preview" onClick={() => setPreviewOpen(false)}>×</button>
          {selectedStoryImage ? <img src={selectedStoryImage} alt={`${selectedPlace.name} story preview`} loading="lazy" decoding="async" /> : null}
          <div>
            <small>{selectedPlace.dateLabel} · {selectedPlace.country}</small>
            <strong>{selectedPlace.story.title ?? selectedPlace.name}</strong>
            {selectedPreviewText ? <p>{selectedPreviewText}</p> : null}
            <a href={`/stories/${selectedPlace.story.slug}`}>Read story →</a>
          </div>
        </article>
      ) : null}
      <div className="map-compass" aria-hidden="true">
        <span>N</span>
      </div>
    </div>
  );
}
