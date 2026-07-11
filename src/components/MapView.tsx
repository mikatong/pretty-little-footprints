import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPoint, Place } from "../types";

type MapViewProps = {
  places: Place[];
  selectedPlace: Place;
  onSelect: (place: Place) => void;
};

const mapStyle = "https://tiles.openfreemap.org/styles/positron";
const worldCenter: [number, number] = [8, 12];
const worldBounds: [[number, number], [number, number]] = [
  [-179.5, -72],
  [179.5, 82],
];

const getWorldZoom = () => {
  if (typeof window === "undefined") return 1.2;
  if (window.innerWidth < 560) return 0.62;
  if (window.innerWidth < 900) return 0.88;
  if (window.innerWidth < 1300) return 1.02;
  return 1.18;
};

const getContinentClass = (place: Place | MapPoint) => {
  if (place.country.includes("United States") || place.country.includes("Canada")) return "north-america";
  if (place.country.includes("Peru") || place.country.includes("Chile") || place.country.includes("Argentina")) {
    return "south-america";
  }
  if (place.country.includes("Japan") || place.country.includes("China") || place.country.includes("Indonesia")) {
    return "asia";
  }
  if (place.country.includes("Antarctica")) return "antarctica";
  return "europe";
};

const getPrimaryPoint = (place: Place): MapPoint | Place | undefined => {
  if (place.lat !== undefined && place.lng !== undefined) return place;
  return place.mapPoints?.find((point) => point.lat !== undefined && point.lng !== undefined);
};

export function MapView({ places, selectedPlace, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ id: string; marker: maplibregl.Marker; element: HTMLButtonElement }[]>([]);
  const [mapReady, setMapReady] = useState(false);

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
      map.addSource("journey-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      map.addLayer({
        id: "journey-route-line",
        type: "line",
        source: "journey-route",
        paint: {
          "line-color": "#8d624c",
          "line-width": 1,
          "line-opacity": 0.32,
          "line-dasharray": [2, 3],
        },
      });

      setMapReady(true);
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const points = place.mapPoints && place.mapPoints.length > 0 ? place.mapPoints : [place];

      points.forEach((point) => {
        if (point.lat === undefined || point.lng === undefined) return;

        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.className = `map-marker ${getContinentClass(point)}`;
        markerElement.setAttribute("aria-label", `Select ${place.name}`);
        markerElement.title = point.name;

        const markerLabel = document.createElement("span");
        markerLabel.textContent = point.name;
        markerElement.appendChild(markerLabel);

        markerElement.addEventListener("click", () => onSelect(place));

        const marker = new maplibregl.Marker({ element: markerElement, anchor: "center" })
          .setLngLat([point.lng, point.lat])
          .addTo(map);

        markersRef.current.push({ id: place.id, marker, element: markerElement });
      });
    });

    const routeCoordinates = places.flatMap((place) => {
      const points = place.mapPoints && place.mapPoints.length > 0 ? place.mapPoints : [place];
      return points
        .filter((point) => point.lat !== undefined && point.lng !== undefined)
        .map((point) => [point.lng as number, point.lat as number]);
    });

    const routeSource = map.getSource("journey-route") as maplibregl.GeoJSONSource | undefined;
    routeSource?.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: routeCoordinates,
      },
    });
  }, [places, mapReady, onSelect]);

  useEffect(() => {
    markersRef.current.forEach(({ id, element }) => {
      element.classList.toggle("selected", id === selectedPlace.id);
    });
  }, [selectedPlace.id, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const primaryPoint = getPrimaryPoint(selectedPlace);

    map.easeTo({
      center: [primaryPoint?.lng ?? worldCenter[0], primaryPoint?.lat ?? worldCenter[1]],
      zoom: Math.max(map.getZoom(), getWorldZoom()),
      duration: 650,
      easing: (time) => 1 - Math.pow(1 - time, 3),
      essential: true,
    });
  }, [selectedPlace, mapReady]);

  return <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />;
}
