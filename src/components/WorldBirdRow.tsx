import { Image, StyleSheet, Text, View } from 'react-native';
import type { WorldBirdSpecies } from '../data/world-birds';
import { colors } from '../theme';

type Props = {
  species: WorldBirdSpecies;
  photoUri: string | null;
};

export function WorldBirdRow({ species, photoUri }: Props) {
  return (
    <View style={styles.row}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.image} />
      ) : (
        <View style={styles.placeholder}><Text style={styles.question}>?</Text></View>
      )}
      <View style={styles.copy}>
        <Text numberOfLines={2} style={styles.name}>{species.name}</Text>
        <Text numberOfLines={1} style={styles.scientific}>{species.scientificName}</Text>
        <Text numberOfLines={1} style={styles.regions}>{species.regions.join(', ')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 96,
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
  image: { width: 78, height: 80, backgroundColor: colors.leaf, borderRadius: 12 },
  placeholder: { width: 78, height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leafDeep, borderRadius: 12 },
  question: { color: colors.ink, fontFamily: 'Georgia', fontSize: 39, lineHeight: 45 },
  copy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 20 },
  scientific: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  regions: { color: colors.muted, fontSize: 11, marginTop: 8 },
});