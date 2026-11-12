import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BirdRow } from '../../src/components/BirdRow';
import { BirdObservationRow } from '../../src/components/BirdObservationRow';
import { PageHeader } from '../../src/components/PageHeader';
import { WorldBirdRow } from '../../src/components/WorldBirdRow';
import { birds } from '../../src/data/birds';
import { birdRegions, type BirdRegion } from '../../src/data/regions';
import { worldBirds } from '../../src/data/world-birds';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import { useEbirdSpeciesSearch } from '../../src/hooks/useEbirdSpeciesSearch';
import { colors } from '../../src/theme';

const filters = ['All', ...birdRegions] as const;
const allSpecies = [...birds, ...worldBirds];

export default function BirdsScreen() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<'All' | BirdRegion>('All');
  const { observations, savedIds, storageError, toggle } = useSavedBirds();
  const { matches: ebirdMatches, loading: ebirdLoading, error: ebirdError } = useEbirdSpeciesSearch(query);
  const { guideBirds, worldSpecies, observationBirds } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matchingGuide = birds.filter((bird) => {
      const matchesSearch = !normalized || `${bird.name} ${bird.scientificName} ${bird.regions.join(' ')}`.toLowerCase().includes(normalized);
      return matchesSearch && (region === 'All' || bird.regions.includes(region));
    });
    const matchingObservations = observations.filter((observation) => {
      const searchableText = [
        observation.commonName ?? 'unidentified bird',
        observation.scientificName ?? '',
        observation.regions.join(' '),
      ].join(' ').toLowerCase();
      const matchesSearch = !normalized || searchableText.includes(normalized);
      return matchesSearch && (region === 'All' || observation.regions.includes(region));
    });
    const observationBirds = matchingObservations.filter((observation) => {
      if (!observation.commonName && !observation.scientificName) return true;
      return !allSpecies.some((bird) =>
        bird.scientificName.toLowerCase() === observation.scientificName?.toLowerCase() ||
        bird.name.toLowerCase() === observation.commonName?.toLowerCase()
      );
    });
    const matchingWorldSpecies = worldBirds.filter((species) => {
      const matchesSearch = !normalized || `${species.name} ${species.scientificName} ${species.regions.join(' ')}`.toLowerCase().includes(normalized);
      return matchesSearch && (region === 'All' || species.regions.includes(region));
    });
    return { guideBirds: matchingGuide, worldSpecies: matchingWorldSpecies, observationBirds };
  }, [observations, query, region]);
  const visibleCount = guideBirds.length + worldSpecies.length + observationBirds.length + ebirdMatches.length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageHeader
        title="Bird index"
        eyebrow="SPECIES DATABASE"
        accessory={
          <View style={styles.count} accessible accessibilityLabel={`${visibleCount} species shown`}>
            <Text style={styles.countText}>{visibleCount.toString().padStart(2, '0')}</Text>
          </View>
        }
      />

      <View style={styles.deviceTop}>
        <View style={styles.lens} />
        <View style={styles.indicatorGroup}>
          <View style={styles.indicator} />
          <View style={[styles.indicator, styles.indicatorDim]} />
        </View>
        <Text style={styles.deviceCode}>SPECIES SCANNER / 01</Text>
      </View>

      <View style={styles.searchBox}>
        <Search color={colors.muted} size={18} />
        <TextInput
          accessibilityLabel="Search birds"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, scientific name, or region"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search">
            <X color={colors.inkSoft} size={17} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const selected = region === item;
          return (
            <Pressable
              key={item}
              onPress={() => setRegion(item)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.filter, selected && styles.filterSelected]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.catalogNote}>
        <Text style={styles.catalogNoteText}>Search the worldwide eBird taxonomy, alongside your field guide and saved observations.</Text>
      </View>
      {storageError && <Text style={styles.error}>Could not update your Pokedex on this device.</Text>}

      {query.trim().length >= 2 && (
        <View style={styles.ebirdSection}>
          <Text style={styles.ebirdHeading}>eBird species database</Text>
          {ebirdLoading && <Text style={styles.ebirdMessage}>Searching the worldwide taxonomy…</Text>}
          {ebirdError && <Text style={styles.error}>{ebirdError}</Text>}
          {ebirdMatches.map((species) => (
            <Pressable
              key={species.speciesCode}
              onPress={() => router.push(`/bird/${species.speciesCode}`)}
              style={styles.ebirdResult}
              accessibilityRole="button"
              accessibilityLabel={`View ${species.comName}, ${species.sciName}`}
            >
              <View style={styles.ebirdCopy}>
                <Text style={styles.ebirdName}>{species.comName}</Text>
                <Text style={styles.ebirdScientific}>{species.sciName}</Text>
                <Text style={styles.ebirdFamily}>
                  {species.familyComName ?? species.familySciName ?? species.category}
                </Text>
              </View>
              <Text style={styles.ebirdCode}>{species.speciesCode}</Text>
            </Pressable>
          ))}
          {!ebirdLoading && !ebirdError && ebirdMatches.length === 0 && (
            <Text style={styles.ebirdMessage}>No eBird species matched that search.</Text>
          )}
        </View>
      )}

      <View style={styles.list}>
        {guideBirds.map((bird) => {
          const matchedObservation = observations.find((observation) =>
            observation.photoUri && (
              observation.scientificName?.toLowerCase() === bird.scientificName.toLowerCase() ||
              observation.commonName?.toLowerCase() === bird.name.toLowerCase()
            )
          );
          return (
          <BirdRow
            key={bird.id}
            bird={bird}
            photoUri={matchedObservation?.photoUri ?? null}
            saved={savedIds.includes(bird.id)}
            onOpen={() => router.push(`/bird/${bird.id}`)}
            onToggleSaved={() => void toggle(bird.id)}
          />
          );
        })}
        {worldSpecies.map((species) => {
          const matchedObservation = observations.find((observation) =>
            observation.photoUri && (
              observation.scientificName?.toLowerCase() === species.scientificName.toLowerCase() ||
              observation.commonName?.toLowerCase() === species.name.toLowerCase()
            )
          );
          return <WorldBirdRow key={species.id} species={species} photoUri={matchedObservation?.photoUri ?? null} />;
        })}
        {observationBirds.map((observation) => (
          <BirdObservationRow key={observation.id} observation={observation} onOpen={() => router.push(`/bird/${observation.id}`)} />
        ))}
        {visibleCount === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No birds match</Text>
            <Text style={styles.emptyText}>Try another name or geographic region.</Text>
          </View>
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 24 },
  count: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  countText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  deviceTop: { height: 34, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, marginBottom: 12, backgroundColor: '#C84E3F', borderWidth: 1, borderColor: '#B24034', borderBottomWidth: 3, borderBottomColor: '#98392F' },
  lens: { width: 16, height: 16, borderWidth: 2, borderColor: '#F4B2A2', backgroundColor: '#4E9DB2' },
  indicatorGroup: { flexDirection: 'row', gap: 4 },
  indicator: { width: 6, height: 6, backgroundColor: '#F2CF67' },
  indicatorDim: { backgroundColor: '#9C332C' },
  deviceCode: { color: '#F8D5CE', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginLeft: 'auto' },
  searchBox: { height: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 2, borderColor: colors.ink, backgroundColor: '#BBD5BD' },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13, paddingVertical: 0 },
  filters: { gap: 7, paddingVertical: 15 },
  filter: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  filterSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.inkSoft, fontSize: 11, fontWeight: '600' },
  filterTextSelected: { color: colors.white },
  catalogNote: { borderLeftWidth: 3, borderLeftColor: colors.coral, paddingLeft: 9, marginBottom: 12 },
  catalogNoteText: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  ebirdSection: { marginBottom: 12 },
  ebirdHeading: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 9 },
  ebirdMessage: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 8 },
  ebirdResult: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 13,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ebirdCopy: { flex: 1, minWidth: 0 },
  ebirdName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  ebirdScientific: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  ebirdFamily: { color: colors.inkSoft, fontSize: 10, marginTop: 4 },
  ebirdCode: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  list: { paddingTop: 2 },
  error: { color: colors.danger, fontSize: 12, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 38, backgroundColor: colors.white },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: 12, marginTop: 5 },
});