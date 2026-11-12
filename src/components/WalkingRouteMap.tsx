import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RouteCoordinate, WalkingRoute } from '../services/walkingDirections';
import { colors } from '../theme';

type Props = {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  route: WalkingRoute;
};

export function WalkingRouteMap({ origin, destination, route }: Props) {
  const cameraRef = useRef<CameraRef>(null);
  const routeFeature = useMemo<GeoJSON.Feature<GeoJSON.LineString>>(() => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: route.coordinates },
  }), [route.coordinates]);
  const longitudes = route.coordinates.map(([longitude]) => longitude);
  const latitudes = route.coordinates.map(([, latitude]) => latitude);
  const bounds: [number, number, number, number] = [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];

  return (
    <View style={styles.container}>
      <Map
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        style={StyleSheet.absoluteFill}
        attribution
        logo
        androidView="texture"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            bounds,
            padding: { top: 56, right: 40, bottom: 56, left: 40 },
          }}
        />
        <GeoJSONSource id="walking-route-source" data={routeFeature}>
          <Layer
            id="walking-route-line"
            type="line"
            paint={{
              'line-color': colors.inkSoft,
              'line-width': 5,
              'line-opacity': 0.9,
            }}
          />
        </GeoJSONSource>
        <Marker id="walking-route-origin" lngLat={[origin.longitude, origin.latitude]}>
          <View style={styles.originMarker}><View style={styles.originCore} /></View>
        </Marker>
        <Marker id="walking-route-destination" lngLat={[destination.longitude, destination.latitude]}>
          <View style={styles.destinationMarker}><Text style={styles.destinationLabel}>BIRD</Text></View>
        </Marker>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 360,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#e4ebdf',
  },
  originMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originCore: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#4c87a0',
    borderWidth: 2,
    borderColor: '#fff',
  },
  destinationMarker: {
    minWidth: 38,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationLabel: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
