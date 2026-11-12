import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bookmark, BookmarkCheck, ChevronRight } from 'lucide-react-native';
import type { Bird } from '../data/birds';
import { colors, rarityColors } from '../theme';

type Props = {
  bird: Bird;
  photoUri: string | null;
  saved: boolean;
  onOpen: () => void;
  onToggleSaved: () => void;
};

export function BirdRow({ bird, photoUri, saved, onOpen, onToggleSaved }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${bird.name}`}
        onPress={onOpen}
        style={styles.main}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.image} />
        ) : (
          <View style={styles.unknownImage}><Text style={styles.question}>?</Text></View>
        )}
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.name}>{bird.name}</Text>
          <Text numberOfLines={1} style={styles.scientific}>{bird.scientificName}</Text>
          <View style={styles.meta}>
            <View style={[styles.dot, { backgroundColor: rarityColors[bird.rarity] }]} />
            <Text style={styles.rarity}>{bird.rarity}</Text>
          </View>
        </View>
        <ChevronRight color={colors.muted} size={18} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? `Remove ${bird.name} from Pokedex` : `Add ${bird.name} to Pokedex`}
        onPress={onToggleSaved}
        hitSlop={8}
        style={styles.saveButton}
      >
        {saved ? <BookmarkCheck color={colors.ink} size={20} /> : <Bookmark color={colors.inkSoft} size={20} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    marginBottom: 12,
    padding: 12,
    minHeight: 104,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  image: { width: 80, height: 80, backgroundColor: colors.leaf, borderRadius: 12 },
  unknownImage: { width: 80, height: 80, backgroundColor: colors.leafDeep, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  question: { color: colors.ink, fontFamily: 'Georgia', fontSize: 39, lineHeight: 45 },
  copy: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 20 },
  scientific: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  rarity: { color: colors.inkSoft, fontSize: 11, textTransform: 'capitalize', fontWeight: '600' },
  saveButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderRadius: 12, backgroundColor: colors.paper },
});