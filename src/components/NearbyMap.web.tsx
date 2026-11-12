import { AttributionControl, Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { NearbyMapSighting } from './nearbyMapTypes';
import type { UserLocation } from '../services/location';

type Props = {
  location: UserLocation | null;
  sightings: NearbyMapSighting[];
  selectedSightingId: string;
  onSelectSighting: (id: string) => void;
};

const defaultCenter: [number, number] = [-122.626, 45.522];
setWorkerUrl('https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl-worker.mjs');

export function NearbyMap({
  location,
  sightings,
  selectedSightingId,
  onSelectSighting,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: defaultCenter,
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new NavigationControl(), 'top-right');
    map.addControl(
      new AttributionControl({
        compact: true,
        customAttribution:
          '<a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>',
      }),
      'bottom-right',
    );
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!location) return;
    mapRef.current?.easeTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 800,
    });
  }, [location]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers = sightings.map((sighting) => {
      const element = document.createElement('button');
      const selected = sighting.id === selectedSightingId;
      element.type = 'button';
      element.className = 'wingdex-sighting-marker';
      element.setAttribute('aria-label', `Show ${sighting.name} sighting`);
      element.setAttribute('aria-pressed', String(selected));
      element.textContent = '🐦';
      Object.assign(element.style, {
        width: selected ? '42px' : '36px',
        height: selected ? '42px' : '36px',
        border: selected ? '2px solid #fff' : '1px solid #e7ede3',
        borderRadius: '50%',
        background: selected ? '#263c31' : '#fff',
        boxShadow: '0 3px 8px rgba(38,57,47,.25)',
        cursor: 'pointer',
        fontSize: selected ? '20px' : '17px',
        lineHeight: '1',
        padding: '0',
      });
      element.addEventListener('click', () => onSelectSighting(sighting.id));

      return new Marker({ element, anchor: 'center' })
        .setLngLat([sighting.longitude, sighting.latitude])
        .addTo(map);
    });

    if (location) {
      const element = document.createElement('div');
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', 'Your current location');
      Object.assign(element.style, {
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      const core = document.createElement('div');
      Object.assign(core.style, {
        width: '11px',
        height: '11px',
        borderRadius: '50%',
        background: '#4c87a0',
        border: '2px solid white',
      });
      element.append(core);
      markers.push(
        new Marker({ element, anchor: 'center' })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map),
      );
    }

    return () => markers.forEach((marker) => marker.remove());
  }, [location, onSelectSighting, selectedSightingId, sightings]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map of nearby bird sightings"
      style={{
        width: '100%',
        height: 420,
        overflow: 'hidden',
        borderRadius: 25,
        background: '#e4ebdf',
      }}
    />
  );
}
