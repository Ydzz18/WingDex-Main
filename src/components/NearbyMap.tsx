import { MapPin } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import type { NearbyMapSighting } from './nearbyMapTypes';
import type { UserLocation } from '../services/location';
import { colors } from '../theme';

type Props = {
  location: UserLocation | null;
  sightings: NearbyMapSighting[];
  selectedSightingId: string;
  onSelectSighting: (id: string) => void;
};

export function NearbyMap({ location }: Props) {
  return (
    <View style={styles.map}>
      <View style={styles.notice}>
        <MapPin color={colors.inkSoft} size={22} />
        <Text style={styles.title}>Interactive map is available on web</Text>
        <Text style={styles.copy}>
          {location
            ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
            : 'Open this screen in a browser to use MapLibre and device location.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 320,
    borderRadius: 25,
    backgroundColor: '#e4ebdf',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notice: { alignItems: 'center', gap: 10 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  copy: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
