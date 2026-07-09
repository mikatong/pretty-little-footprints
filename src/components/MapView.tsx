import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "../types";

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
    map.on("load", () => setMapReady(true));
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
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `map-marker ${place.category}`;
      markerElement.setAttribute("aria-label", `Select ${place.name}`);
      markerElement.dataset.labelPosition = place.labelPosition ?? "right";
      markerElement.style.setProperty("--label-x", `${place.labelOffset?.[0] ?? 0}px`);
      markerElement.style.setProperty("--label-y", `${place.labelOffset?.[1] ?? 0}px`);
      markerElement.title = place.name;

      const markerLabel = document.createElement("span");
      markerLabel.textContent = place.name;
      markerElement.appendChild(markerLabel);

      markerElement.addEventListener("click", () => onSelect(place));

      const marker = new maplibregl.Marker({ element: markerElement, anchor: "center" })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markersRef.current.push({ id: place.id, marker, element: markerElement });
    });
  }, [places, mapReady, onSelect]);

  useEffect(() => {
    markersRef.current.forEach(({ id, element }) => {
      element.classList.toggle("selected", id === selectedPlace.id);
    });
  }, [selectedPlace.id, places]);

  return <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />;
}
