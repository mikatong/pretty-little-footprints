import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapIconType, MapPoint, Place } from "../types";
import { getStartTime } from "../storyUtils";

type MapViewProps = {
  places: Place[];
  selectedPlace: Place;
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
const debugMapQueryParam = "debugMap";
const debugJourneyMap = false;
const iconTypes: MapIconType[] = [
  "home",
  "city",
  "temple",
  "mountain",
  "snow",
  "forest",
  "coast",
  "tropical",
  "desert",
  "waterfall",
  "landmark",
  "default",
];

const emptyFeatureCollection = {
  type: "FeatureCollection",
  features: [],
} as const;

const yearRouteColors: Record<string, string> = {
  "2026": "#A66F5F",
  "2025": "#9B7AA6",
  "2024": "#7397B5",
  "2023": "#7E9A82",
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
  if (window.innerWidth < 1300) return 1.02;
  return 1.18;
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

const inferIconType = (place: Place, point: MapPoint | Place): MapIconType => {
  if (place.mapIconType) return place.mapIconType;
  const text = `${place.id} ${place.name} ${point.name} ${place.country}`.toLowerCase();
  if (place.category === "lived" && /west-vancouver|mountain-view/.test(text)) return "home";
  if (/canggu|ubud|bali|hawaii|honolulu|maui|big-island/.test(text)) return "tropical";
  if (/beijing|taiyuan|chengdu|xiamen|chongqing|dali|china|japan|tokyo|seoul/.test(text)) return "temple";
  if (/peru|patagonia|machu|cusco|andes|grand-canyon|yosemite|tahoe|mount|mountain/.test(text)) return "mountain";
  if (/antarctica|iceland|snow|glacier/.test(text)) return "snow";
  if (/vancouver|redwood|forest|algonquin/.test(text)) return "forest";
  if (/big-sur|santa-cruz|coast|victoria|lima|nice|cancun/.test(text)) return "coast";
  if (/arizona|phoenix|palm|joshua|page|desert|las-vegas/.test(text)) return "desert";
  if (/niagara/.test(text)) return "waterfall";
  if (/london|paris|toronto|chicago|new-york|montreal|waterloo|ann-arbor|stanford|cambridge|oxford/.test(text)) return "city";
  return "landmark";
};

const iconImageName = (iconType: MapIconType, state: "lived" | "visited" | "selected") => {
  return `plm-${iconType}-${state}`;
};

const getIconSvg = (iconType: MapIconType, state: "lived" | "visited" | "selected") => {
  const lived = state === "lived";
  const selected = state === "selected";
  const stroke = selected ? "#7E5146" : lived ? "#8A594B" : "#6F92A7";
  const fill = selected ? "#F2DFD5" : lived ? "#D7A08C" : "#EEF5F6";
  const soft = selected ? "#F8EEE8" : lived ? "#F4E6DC" : "#F1F6F5";
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const line = `fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
  const bg = `<circle cx="16" cy="16" r="13" fill="${soft}" opacity="${selected ? "1" : "0.92"}"/>`;
  const shapes: Record<MapIconType, string> = {
    home: `<path ${common} d="M8 16 16 9l8 7v8H10v-8z"/><path ${line} d="M14 24v-6h4v6"/>`,
    city: `<path ${common} d="M9 24V11h6v13M17 24V8h6v16"/><path ${line} d="M11 14h2M11 18h2M19 12h2M19 16h2M19 20h2"/>`,
    temple: `<path ${common} d="M8 13h16l-8-5z"/><path ${line} d="M10 15v8M15 15v8M20 15v8M8 24h16"/>`,
    mountain: `<path ${common} d="M7 24 15 9l4 7 2-3 5 11z"/><path ${line} d="m15 9 2 7 2-1"/>`,
    snow: `<path ${common} d="M7 24 15 10l4 6 2-3 5 11z"/><path ${line} d="M16 7v8M12 10l8 4M20 10l-8 4"/>`,
    forest: `<path ${common} d="M12 22h8L16 8z"/><path ${common} d="M7 24h8l-4-11z"/><path ${line} d="M16 22v3M11 24v2"/>`,
    coast: `<path ${common} d="M9 22c4-5 9-7 15-7v7z"/><path ${line} d="M7 13c4 2 7 2 11 0M8 17c3 1.5 6 1.5 9 0"/>`,
    tropical: `<path ${line} d="M16 25c2-7 2-12 0-17"/><path ${common} d="M16 10c-5-2-8 0-10 4 4 0 7-1 10-4z"/><path ${common} d="M17 10c5-2 8 0 10 4-4 0-7-1-10-4z"/>`,
    desert: `<path ${common} d="M14 24V9a3 3 0 0 1 6 0v15"/><path ${line} d="M14 15h-3a3 3 0 0 1-3-3M20 17h3a3 3 0 0 0 3-3"/>`,
    waterfall: `<path ${common} d="M9 9h14l-3 15H12z"/><path ${line} d="M13 12v8M17 12v8M21 12v8"/>`,
    landmark: `<path ${common} d="M9 24h14l-2-10h-10z"/><path ${line} d="M16 8v16M12 8h8M11 13h10"/>`,
    default: `<path ${common} d="M16 7c5 0 8 3 8 7 0 5-8 11-8 11S8 19 8 14c0-4 3-7 8-7z"/><circle cx="16" cy="14" r="2.5" fill="${stroke}"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">${bg}${shapes[iconType]}</svg>`;
};

const loadSvgImage = (svg: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image(32, 32);
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
};

const registerMapIcons = async (map: maplibregl.Map) => {
  await Promise.all(iconTypes.flatMap((iconType) =>
    (["lived", "visited", "selected"] as const).map(async (state) => {
      const name = iconImageName(iconType, state);
      if (map.hasImage(name)) return;
      const image = await loadSvgImage(getIconSvg(iconType, state));
      map.addImage(name, image, { pixelRatio: 2 });
    })
  ));
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
    const iconType = inferIconType(place, point);
    return [{
      id: point.id,
      entryId: place.id,
      title: point.name,
      locationType,
      iconType,
      iconImage: iconImageName(iconType, locationType),
      selectedIconImage: iconImageName(iconType, "selected"),
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
      geometry: { type: "LineString", coordinates },
    }],
  };
};

const getSelectedRouteFeatureCollection = (selectedPlace: Place) => {
  const routeCoordinates = getValidPoints(selectedPlace).map((point) => point.coordinates);
  if (!selectedPlace.mapPoints || routeCoordinates.length < 2) return emptyFeatureCollection;
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { id: selectedPlace.id },
      geometry: { type: "LineString", coordinates: routeCoordinates },
    }],
  };
};

const setCursor = (map: maplibregl.Map, cursor: string) => {
  map.getCanvas().style.cursor = cursor;
};

export function MapView({ places, selectedPlace, activeYear, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const lastCameraSelectionRef = useRef<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const pointData = useMemo(() => getPointFeatureCollection(places, selectedPlace), [places, selectedPlace]);
  const yearRouteData = useMemo(() => getYearRouteFeatureCollection(places, activeYear, selectedPlace), [places, activeYear, selectedPlace]);
  const selectedRouteData = useMemo(() => getSelectedRouteFeatureCollection(selectedPlace), [selectedPlace]);

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
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => {
      void (async () => {
        await registerMapIcons(map);
        map.addSource(yearRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(selectedRouteSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addSource(pointSourceId, { type: "geojson", data: emptyFeatureCollection });
        map.addLayer({ id: "journal-year-route-casing", type: "line", source: yearRouteSourceId, paint: { "line-color": "#F5EFE7", "line-width": 4, "line-opacity": 0.72, "line-dasharray": [1.5, 2.2] } });
        map.addLayer({ id: "journal-year-route", type: "line", source: yearRouteSourceId, paint: { "line-color": ["coalesce", ["get", "color"], "#8D624C"], "line-width": 2, "line-opacity": 0.72, "line-dasharray": [1.5, 2.2] } });
        map.addLayer({ id: "journey-route-line-selected-casing", type: "line", source: selectedRouteSourceId, paint: { "line-color": "#F5EFE7", "line-width": 5, "line-opacity": 0.9, "line-dasharray": [1.8, 2.4] } });
        map.addLayer({ id: "journey-route-line-selected", type: "line", source: selectedRouteSourceId, paint: { "line-color": "#9B6657", "line-width": 2.8, "line-opacity": 0.95, "line-dasharray": [1.8, 2.4] } });
        map.addLayer({ id: "visited-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "visited"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.52, 3, 0.72], "icon-allow-overlap": true } });
        map.addLayer({ id: "lived-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "locationType"], "lived"], ["!=", ["get", "selected"], true], ["!=", ["get", "relatedToSelectedJourney"], true]], layout: { "icon-image": ["get", "iconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.58, 3, 0.78], "icon-allow-overlap": true } });
        map.addLayer({ id: "related-journey-halo", type: "circle", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 10, 3, 13], "circle-color": "rgba(180, 122, 103, 0.18)", "circle-stroke-color": "rgba(180, 122, 103, 0.34)", "circle-stroke-width": 1 } });
        map.addLayer({ id: "related-journey-icons", type: "symbol", source: pointSourceId, filter: ["all", ["==", ["get", "relatedToSelectedJourney"], true], ["!=", ["get", "selected"], true]], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.72, 3, 0.9], "icon-allow-overlap": true } });
        map.addLayer({ id: "selected-point-ring", type: "circle", source: pointSourceId, filter: ["==", ["get", "selected"], true], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 0.5, 13, 3, 15], "circle-color": "rgba(126,81,70,0.28)", "circle-stroke-color": "rgba(126,81,70,0.22)", "circle-stroke-width": 1 } });
        map.addLayer({ id: "selected-icon", type: "symbol", source: pointSourceId, filter: ["==", ["get", "selected"], true], layout: { "icon-image": ["get", "selectedIconImage"], "icon-size": ["interpolate", ["linear"], ["zoom"], 0.5, 0.78, 3, 0.96], "icon-allow-overlap": true } });
        map.addLayer({ id: "selected-place-labels", type: "symbol", source: pointSourceId, filter: ["any", ["==", ["get", "selected"], true], ["==", ["get", "relatedToSelectedJourney"], true]], layout: { "text-field": ["get", "title"], "text-size": 11, "text-offset": [1.4, 0], "text-anchor": "left", "text-allow-overlap": false }, paint: { "text-color": "#2c241f", "text-halo-color": "#fffdfc", "text-halo-width": 1.1, "text-opacity": 0.88 } });
        const clickableLayers = ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon"];
        clickableLayers.forEach((layerId) => {
          map.on("click", layerId, (event) => {
            const entryId = event.features?.[0]?.properties?.entryId;
            const selectedEntry = places.find((place) => place.id === entryId);
            if (selectedEntry) onSelect(selectedEntry);
          });
          map.on("mouseenter", layerId, () => setCursor(map, "pointer"));
          map.on("mouseleave", layerId, () => setCursor(map, ""));
        });
        setMapReady(true);
      })();
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [onSelect, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const pointSource = map.getSource(pointSourceId) as maplibregl.GeoJSONSource | undefined;
    const yearRouteSource = map.getSource(yearRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    const selectedRouteSource = map.getSource(selectedRouteSourceId) as maplibregl.GeoJSONSource | undefined;
    pointSource?.setData(pointData as never);
    yearRouteSource?.setData(yearRouteData as never);
    selectedRouteSource?.setData(selectedRouteData as never);
    if (import.meta.env.DEV && shouldDebugMap()) {
      console.info("Journal Map debug", {
        selectedEntryId: selectedPlace.id,
        activeYear,
        pointFeatureCount: pointData.features.length,
        yearRouteCoordinateCount: yearRouteData.features[0]?.geometry.coordinates.length ?? 0,
        selectedJourneyCoordinateCount: selectedRouteData.features[0]?.geometry.coordinates.length ?? 0,
        selectedJourneyCoordinates: selectedRouteData.features[0]?.geometry.coordinates ?? [],
        routeSources: { year: Boolean(yearRouteSource), selected: Boolean(selectedRouteSource) },
        iconLayers: ["visited-icons", "lived-icons", "related-journey-icons", "selected-icon"].every((id) => Boolean(map.getLayer(id))),
      });
    }
  }, [mapReady, pointData, yearRouteData, selectedRouteData, selectedPlace.id, activeYear]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (lastCameraSelectionRef.current === selectedPlace.id) return;
    lastCameraSelectionRef.current = selectedPlace.id;
    const primaryPoint = getPrimaryPoint(selectedPlace);
    const selectedRoutePoints = getValidPoints(selectedPlace);
    if (selectedRoutePoints.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      selectedRoutePoints.forEach((point) => bounds.extend(point.coordinates));
      map.fitBounds(bounds, { padding: window.innerWidth < 700 ? 46 : 72, maxZoom: 3.4, duration: 650, essential: true });
      return;
    }
    map.easeTo({ center: primaryPoint?.coordinates ?? worldCenter, zoom: Math.max(map.getZoom(), getWorldZoom()), duration: 650, easing: (time) => 1 - Math.pow(1 - time, 3), essential: true });
  }, [selectedPlace, mapReady]);

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />
      <div className="map-legend" aria-label="Map marker legend">
        <span><i className="legend-icon legend-lived" /> Lived</span>
        <span><i className="legend-icon legend-visited" /> Visited</span>
        <span><i className="legend-route" /> Selected route</span>
      </div>
    </div>
  );
}
