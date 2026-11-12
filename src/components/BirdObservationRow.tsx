import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { BirdObservation } from '../services/collection';
import { colors } from '../theme';

type Props = {
  observation: BirdObservation;
  onOpen: () => void;
};

export function BirdObservationRow({ observation, onOpen }: Props) {
  const identified = Boolean(observation.commonName && observation.photoUri);
  const regionLabel = observation.regions.join(', ') || 'Range unknown';

  return (
    <Pressable onPress={onOpen} style={styles.row} accessibilityRole="button" accessibilityLabel={`View ${observation.commonName ?? 'unidentified bird'} sighting`}>
      {identified ? (
        <Image source={{ uri: observation.photoUri! }} style={styles.image} />
      ) : (
        <View style={styles.unknownImage}><Text style={styles.question}>?</Text></View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{observation.commonName ?? 'Unidentified bird'}</Text>
        {observation.scientificName && <Text numberOfLines={1} style={styles.scientific}>{observation.scientificName}</Text>}
        <Text numberOfLines={1} style={styles.meta}>{regionLabel} · {new Date(observation.identifiedAt).toLocaleDateString()}</Text>
      </View>
      <ChevronRight color={colors.muted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  image: { width: 72, height: 72, backgroundColor: colors.leaf, borderRadius: 12 },
  unknownImage: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leafDeep, borderRadius: 12 },
  question: { color: colors.ink, fontFamily: 'Georgia', fontSize: 39, lineHeight: 45 },
  copy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  scientific: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  meta: { color: colors.muted, fontSize: 11, marginTop: 8 },
});