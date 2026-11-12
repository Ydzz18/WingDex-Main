import { AttributionControl, LngLatBounds, Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { RouteCoordinate, WalkingRoute } from '../services/walkingDirections';

type Props = {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  route: WalkingRoute;
};

setWorkerUrl('https://unpkg.com/maplibre-gl@6.17.0/dist/maplibre-gl-worker.mjs');

export function WalkingRouteMap({ origin, destination, route }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [origin.longitude, origin.latitude],
      zoom: 13,
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

    const originElement = document.createElement('div');
    originElement.setAttribute('role', 'img');
    originElement.setAttribute('aria-label', 'Starting location');
    Object.assign(originElement.style, {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#4c87a0',
      border: '3px solid white',
      boxShadow: '0 1px 5px rgba(0,0,0,.4)',
    });
    const destinationElement = document.createElement('div');
    destinationElement.textContent = 'BIRD';
    destinationElement.setAttribute('role', 'img');
    destinationElement.setAttribute('aria-label', 'Bird sighting destination');
    Object.assign(destinationElement.style, {
      padding: '7px 9px',
      borderRadius: '16px',
      color: '#fff',
      background: '#1B2E26',
      border: '2px solid #fff',
      boxShadow: '0 1px 5px rgba(0,0,0,.4)',
      font: '800 10px sans-serif',
      letterSpacing: '.5px',
    });
    const markers = [
      new Marker({ element: originElement })
        .setLngLat([origin.longitude, origin.latitude])
        .addTo(map),
      new Marker({ element: destinationElement })
        .setLngLat([destination.longitude, destination.latitude])
        .addTo(map),
    ];

    const addRoute = () => {
      if (!map.getSource('walking-route')) {
        map.addSource('walking-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: route.coordinates },
          },
        });
        map.addLayer({
          id: 'walking-route-line',
          type: 'line',
          source: 'walking-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#38564D',
            'line-width': 5,
            'line-opacity': 0.9,
          },
        });
      }
      const bounds = route.coordinates.reduce(
        (result, coordinate) => result.extend(coordinate),
        new LngLatBounds(route.coordinates[0], route.coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 64, maxZoom: 16 });
    };
    map.on('load', addRoute);

    return () => {
      map.off('load', addRoute);
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [destination.latitude, destination.longitude, origin.latitude, origin.longitude, route.coordinates]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Pedestrian route map"
      style={{ width: '100%', height: 420, overflow: 'hidden', borderRadius: 22, background: '#e4ebdf' }}
    />
  );
}
