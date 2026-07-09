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
      center: [15, 20],
      zoom: 1.35,
      attributionControl: true,
    });

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

    if (places.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      places.forEach((place) => bounds.extend([place.lng, place.lat]));
      map.fitBounds(bounds, {
        padding: { top: 80, right: 80, bottom: 80, left: 80 },
        maxZoom: 3.2,
        duration: 700,
      });
    }
  }, [places, mapReady, onSelect]);

  useEffect(() => {
    markersRef.current.forEach(({ id, element }) => {
      element.classList.toggle("selected", id === selectedPlace.id);
    });
  }, [selectedPlace.id, places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedPlace) return;

    map.flyTo({
      center: [selectedPlace.lng, selectedPlace.lat],
      zoom: Math.max(map.getZoom(), 2.4),
      duration: 700,
      essential: true,
    });
  }, [selectedPlace, mapReady]);

  return <div ref={containerRef} className="map-view" aria-label="Interactive travel footprint map" />;
}
