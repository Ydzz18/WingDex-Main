import * as Location from 'expo-location';
import { Platform } from 'react-native';

export type UserLocation = {
  latitude: number;
  longitude: number;
};

export function getCurrentLocation(): Promise<UserLocation> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return Promise.reject(new Error('Location is unavailable in this browser.'));
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
        (error) => {
          const message = error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : error.code === error.POSITION_UNAVAILABLE
              ? 'Your location is unavailable right now.'
              : 'Location lookup timed out.';
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
      );
    });
  }

  return Location.requestForegroundPermissionsAsync().then((permission) => {
    if (!permission.granted) {
      throw new Error('Location permission was denied.');
    }
    return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  }).then(({ coords }) => ({
    latitude: coords.latitude,
    longitude: coords.longitude,
  }));
}
