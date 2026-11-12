import { Camera, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NearbyMapSighting } from './nearbyMapTypes';
import type { UserLocation } from '../services/location';

type Props = {
  location: UserLocation | null;
  sightings: NearbyMapSighting[];
  selectedSightingId: string;
  onSelectSighting: (id: string) => void;
};

const mapStyle = 'https://tiles.openfreemap.org/styles/liberty';
const defaultCenter: [number, number] = [-122.626, 45.522];

export function NearbyMap({
  location,
  sightings,
  selectedSightingId,
  onSelectSighting,
}: Props) {
  const cameraRef = useRef<CameraRef>(null);

  useEffect(() => {
    if (!location) return;
    cameraRef.current?.easeTo({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 800,
    });
  }, [location]);

  return (
    <View style={styles.container}>
      <Map
        mapStyle={mapStyle}
        style={StyleSheet.absoluteFill}
        attribution
        logo
        androidView="texture"
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: location
              ? [location.longitude, location.latitude]
              : defaultCenter,
            zoom: location ? 14 : 2,
          }}
        />
        {location && (
          <Marker
            id="user-location"
            lngLat={[location.longitude, location.latitude]}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerCore} />
            </View>
          </Marker>
        )}
        {sightings.map((sighting) => {
          const selected = sighting.id === selectedSightingId;
          return (
            <Marker
              key={sighting.id}
              id={sighting.id}
              lngLat={[sighting.longitude, sighting.latitude]}
              selected={selected}
              onPress={() => onSelectSighting(sighting.id)}
            >
              <View style={[styles.sightingMarker, selected && styles.selectedSightingMarker]}>
                <Text style={styles.sightingMarkerText}>🐦</Text>
              </View>
            </Marker>
          );
        })}
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#e4ebdf',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4c87a0',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sightingMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e7ede3',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  selectedSightingMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#263c31',
  },
  sightingMarkerText: {
    fontSize: 17,
    lineHeight: 20,
  },
});
