import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  Binoculars,
  Bookmark,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Feather,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BirdRow } from '../../src/components/BirdRow';
import { PageHeader, PageHeaderAction } from '../../src/components/PageHeader';
import { birds } from '../../src/data/birds';
import { birdRegions, type BirdRegion } from '../../src/data/regions';
import { worldBirds } from '../../src/data/world-birds';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import type { BirdObservation } from '../../src/services/collection';
import { colors } from '../../src/theme';

type CollectionFilter = 'All birds' | 'Favorites';

const knownSpecies = new Map<string, string>();
for (const bird of [...birds, ...worldBirds]) {
  const species = bird.scientificName.trim().toLocaleLowerCase();
  knownSpecies.set(species, species);
  knownSpecies.set(bird.name.trim().toLocaleLowerCase(), species);
}

function speciesKey(observation: BirdObservation) {
  const scientificName = observation.scientificName?.trim().toLocaleLowerCase() ?? '';
  const commonName = observation.commonName?.trim().toLocaleLowerCase() ?? '';
  return knownSpecies.get(scientificName) ?? knownSpecies.get(commonName) ?? (scientificName || commonName);
}

function observationTime(observation: BirdObservation) {
  const timestamp = new Date(observation.identifiedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatObservationDate(identifiedAt: string) {
  const date = new Date(identifiedAt);
  if (Number.isNaN(date.getTime())) return 'Date unknown';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ObservationCard({
  observation,
  isNew,
  onOpen,
}: {
  observation: BirdObservation;
  isNew: boolean;
  onOpen: () => void;
}) {
  const identified = Boolean(observation.commonName);
  const region = observation.regions.filter((item) => item !== 'Unknown').join(', ');
  const location = observation.location
    ? `${observation.location.latitude.toFixed(5)}, ${observation.location.longitude.toFixed(5)}`
    : null;

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.observationCard, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`View ${observation.commonName ?? 'unidentified bird'} sighting`}
    >
      {observation.photoUri ? (
        <Image source={{ uri: observation.photoUri }} style={styles.observationImage} />
      ) : (
        <View style={styles.imageFallback}>
          <Feather color={colors.inkSoft} size={23} />
        </View>
      )}
      <View style={styles.observationCopy}>
        <View style={styles.observationTitleRow}>
          <Text numberOfLines={1} style={styles.observationName}>
            {observation.commonName ?? 'Unidentified bird'}
          </Text>
          {isNew && <Text style={styles.newBadge}>NEW</Text>}
        </View>
        {observation.scientificName ? (
          <Text numberOfLines={1} style={styles.scientificName}>{observation.scientificName}</Text>
        ) : (
          <Text numberOfLines={1} style={styles.scientificName}>Field observation</Text>
        )}
        <Text numberOfLines={1} style={styles.observationMeta}>
          {[region, location, formatObservationDate(observation.identifiedAt)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <ChevronRight color={colors.muted} size={19} />
      {!identified && <View style={styles.unknownMarker} />}
    </Pressable>
  );
}

export default function CollectionScreen() {
  const [filter, setFilter] = useState<CollectionFilter>('All birds');
  const [region, setRegion] = useState<'All' | BirdRegion>('All');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);
  const { observations, savedIds, storageError, syncError, syncing, retrySync, toggle } = useSavedBirds();

  const latestObservationTime = useMemo(
    () => Math.max(0, ...observations.map(observationTime)),
    [observations]
  );

  const identifiedSpecies = useMemo(() => {
    const result = new Set<string>();
    observations.forEach((observation) => {
      if (observation.commonName || observation.scientificName) {
        result.add(speciesKey(observation));
      }
    });
    return result;
  }, [observations]);

  const newestDiscoveryId = useMemo(() => {
    const ordered = [...observations].sort((left, right) => observationTime(left) - observationTime(right));
    const firstSightings = new Map<string, BirdObservation>();
    ordered.forEach((observation) => {
      if (observation.commonName || observation.scientificName) {
        const key = speciesKey(observation);
        if (key && !firstSightings.has(key)) firstSightings.set(key, observation);
      }
    });
    const recentCutoff = latestObservationTime > 0
      ? latestObservationTime - 7 * 24 * 60 * 60 * 1000
      : Number.POSITIVE_INFINITY;
    return [...firstSightings.values()]
      .filter((observation) => observationTime(observation) >= recentCutoff)
      .sort((left, right) => observationTime(right) - observationTime(left))[0]?.id;
  }, [latestObservationTime, observations]);

  const filteredObservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return [...observations]
      .filter((observation) => filter === 'All birds' || savedIds.some((id) => {
        const bird = birds.find((item) => item.id === id);
        return bird && (
          bird.scientificName.toLocaleLowerCase() === observation.scientificName?.toLocaleLowerCase() ||
          bird.name.toLocaleLowerCase() === observation.commonName?.toLocaleLowerCase()
        );
      }))
      .filter((observation) => region === 'All' || observation.regions.includes(region))
      .filter((observation) => !normalizedQuery || [
        observation.commonName ?? 'unidentified bird',
        observation.scientificName ?? '',
        observation.regions.join(' '),
      ].join(' ').toLocaleLowerCase().includes(normalizedQuery))
      .sort((left, right) => newestFirst
        ? observationTime(right) - observationTime(left)
        : observationTime(left) - observationTime(right));
  }, [filter, newestFirst, observations, query, region, savedIds]);

  const favoriteBirds = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return birds.filter((bird) =>
      savedIds.includes(bird.id) &&
      (region === 'All' || bird.regions.includes(region)) &&
      (!normalizedQuery || `${bird.name} ${bird.scientificName} ${bird.regions.join(' ')}`
        .toLocaleLowerCase().includes(normalizedQuery))
    );
  }, [query, region, savedIds]);

  const recentDiscoveries = observations.filter((observation) =>
    latestObservationTime > 0 &&
    observation.commonName &&
    observationTime(observation) >= latestObservationTime - 7 * 24 * 60 * 60 * 1000
  ).length;
  const favoriteCount = savedIds.length;
  const noResults = filter === 'Favorites' ? favoriteBirds.length === 0 : filteredObservations.length === 0;
  const dateContext = latestObservationTime
    ? new Date(latestObservationTime).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'Awaiting first note';

  const shareCollection = () => router.push('/share_collection');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="My collection"
          subtitle="Every bird has a story. Here’s yours."
          accessory={
            <PageHeaderAction
              onPress={shareCollection}
              accessibilityLabel="Share collection"
            >
              <Share2 color={colors.ink} size={19} />
            </PageHeaderAction>
          }
        />

        <View style={styles.summaryCard}>
          <View style={styles.summaryTopline}>
            <View style={styles.profileMark}><BookOpenText color="#E5EEE5" size={19} /></View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileLabel}>YOUR FIELD JOURNAL</Text>
              <Text style={styles.profileTitle}>A life list in the making</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.metrics}>
            <View style={styles.primaryMetric}>
              <Text style={styles.metricValue}>{identifiedSpecies.size}</Text>
              <Text style={styles.metricLabel}>SPECIES</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValueSmall}>{observations.length}</Text>
              <Text style={styles.metricLabel}>SIGHTINGS</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Text style={styles.metricValueSmall}>{favoriteCount}</Text>
              <Text style={styles.metricLabel}>SAVED</Text>
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <View style={styles.trend}>
              <Sparkles color={colors.yellow} size={14} />
              <Text style={styles.trendText}>{recentDiscoveries} {recentDiscoveries === 1 ? 'sighting' : 'sightings'} · 7 days</Text>
            </View>
            <View style={styles.dateContext}>
              <CalendarDays color="#B8C8BD" size={13} />
              <Text style={styles.dateText}>{dateContext}</Text>
            </View>
          </View>
        </View>

        {storageError && (
          <Text accessibilityRole="alert" style={styles.error}>
            Your local collection could not be read or updated. Please try again.
          </Text>
        )}

        <View style={styles.syncNotice}>
          <View style={styles.syncCopy}>
            <Text style={styles.syncTitle}>
              {syncing ? 'Syncing your field journal…' : syncError ? 'Cloud sync is waiting' : 'Your field journal stays yours'}
            </Text>
            <Text style={styles.syncDetail}>
              {syncError
                ? 'Your local notes are safe. Retry when you’re back online.'
                : 'Sightings and saved birds sync when online. Photos remain on this device.'}
            </Text>
          </View>
          {syncError && (
            <Pressable
              onPress={() => void retrySync()}
              disabled={syncing}
              style={({ pressed }) => [styles.syncAction, pressed && styles.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Retry collection cloud sync"
            >
              <Text style={styles.syncActionText}>Retry</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            accessibilityLabel="Search collection"
            value={query}
            onChangeText={setQuery}
            placeholder="Search your birds"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8}>
              <X color={colors.inkSoft} size={17} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          accessibilityLabel="Collection filters"
        >
          {(['All birds', 'Favorites'] as const).map((item) => {
            const selected = filter === item;
            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                {item === 'Favorites' && <Bookmark color={selected ? colors.white : colors.inkSoft} size={14} />}
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
          <View style={styles.filterDivider} />
          {(['All', ...birdRegions] as const).map((item) => {
            const selected = region === item;
            return (
              <Pressable
                key={item}
                onPress={() => setRegion(item)}
                style={[styles.regionChip, selected && styles.regionChipSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.regionText, selected && styles.regionTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{filter === 'Favorites' ? 'Saved favorites' : 'Recent discoveries'}</Text>
            <Text style={styles.sectionSubtitle}>{filter === 'Favorites' ? `${favoriteBirds.length} saved species` : `${filteredObservations.length} field ${filteredObservations.length === 1 ? 'note' : 'notes'}`}</Text>
          </View>
          {filter === 'All birds' && (
            <Pressable
              onPress={() => setNewestFirst((current) => !current)}
              style={({ pressed }) => [styles.sortButton, pressed && styles.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Sort ${newestFirst ? 'oldest' : 'newest'} first`}
            >
              <Text style={styles.sortText}>{newestFirst ? 'Newest' : 'Oldest'}</Text>
              <ChevronDown color={colors.inkSoft} size={15} style={!newestFirst && styles.chevronReversed} />
            </Pressable>
          )}
        </View>

        {noResults ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Feather color={colors.inkSoft} size={25} /></View>
            <Text style={styles.emptyTitle}>
              {filter === 'Favorites'
                ? 'No saved birds here yet'
                : query.trim()
                  ? 'No matching field notes'
                  : region === 'All'
                    ? 'Your field notes start here'
                    : `No birds in ${region}`}
            </Text>
            <Text style={styles.emptyCopy}>
              {filter === 'Favorites'
                ? 'Save a species from the bird guide and it will be waiting here.'
                : query.trim()
                  ? 'Try another name, region, or scientific name.'
                  : 'Your identified sightings and field notes will gather here.'}
            </Text>
            <Pressable
              onPress={() => router.push('/birds')}
              style={({ pressed }) => [styles.browseButton, pressed && styles.buttonPressed]}
              accessibilityRole="button"
            >
              <Text style={styles.browseText}>{filter === 'Favorites' ? 'Explore the bird guide' : 'Find your next bird'}</Text>
              <ChevronRight color={colors.white} size={16} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {filter === 'Favorites'
              ? favoriteBirds.map((bird) => {
                const matchedObservation = observations.find((observation) =>
                  observation.photoUri && (
                    bird.scientificName.toLowerCase() === observation.scientificName?.toLowerCase() ||
                    bird.name.toLowerCase() === observation.commonName?.toLowerCase()
                  )
                );
                return (
                  <BirdRow
                    key={bird.id}
                    bird={bird}
                    photoUri={matchedObservation?.photoUri ?? null}
                    saved
                    onOpen={() => router.push(`/bird/${bird.id}`)}
                    onToggleSaved={() => void toggle(bird.id)}
                  />
                );
              })
              : filteredObservations.map((observation) => (
                <ObservationCard
                  key={observation.id}
                  observation={observation}
                  isNew={observation.id === newestDiscoveryId}
                  onOpen={() => router.push(`/bird/${observation.id}`)}
                />
              ))}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/nearby')}
          style={({ pressed }) => [styles.discoveryPrompt, pressed && styles.discoveryPressed]}
          accessibilityRole="button"
          accessibilityLabel="Explore nearby birds"
        >
          <View style={styles.promptIcon}><Binoculars color={colors.inkSoft} size={21} /></View>
          <View style={styles.promptCopy}>
            <Text style={styles.promptEyebrow}>KEEP LOOKING</Text>
            <Text style={styles.promptTitle}>Your next discovery is out there</Text>
            <Text style={styles.promptBody}>Take a look at what’s nearby.</Text>
          </View>
          <ChevronRight color={colors.inkSoft} size={18} />
        </Pressable>

        <Text style={styles.localNote}>Saved on this device · Ranges are not sighting locations</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  buttonPressed: { opacity: 0.72 },
  summaryCard: { backgroundColor: colors.ink, borderRadius: 22, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 14, overflow: 'hidden' },
  summaryTopline: { flexDirection: 'row', alignItems: 'center' },
  profileMark: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2D4A3D', borderWidth: 1, borderColor: '#557164' },
  profileCopy: { flex: 1, marginLeft: 11 },
  profileLabel: { color: '#B5C7B9', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  profileTitle: { color: colors.white, fontFamily: 'Georgia', fontSize: 16, marginTop: 3 },
  summaryDivider: { height: 1, backgroundColor: '#476054', marginTop: 14, marginBottom: 12 },
  metrics: { flexDirection: 'row', alignItems: 'center' },
  primaryMetric: { minWidth: 89 },
  metric: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, height: 34, backgroundColor: '#476054' },
  metricValue: { color: colors.white, fontFamily: 'Georgia', fontSize: 34, lineHeight: 38 },
  metricValueSmall: { color: colors.white, fontFamily: 'Georgia', fontSize: 23, lineHeight: 28 },
  metricLabel: { color: '#D0DDD3', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginTop: 3 },
  summaryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendText: { color: '#E5EEE5', fontSize: 11, fontWeight: '600' },
  dateContext: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { color: '#D0DDD3', fontSize: 11 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 11 },
  syncNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginTop: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: '#EFF3EC' },
  syncCopy: { flex: 1 },
  syncTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  syncDetail: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  syncAction: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.ink },
  syncActionText: { color: colors.white, fontSize: 10, fontWeight: '700' },
  searchBox: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, marginTop: 17, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, paddingVertical: 9 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 13, paddingBottom: 3 },
  filterChip: { minHeight: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 13, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  filterChipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  filterTextSelected: { color: colors.white },
  filterDivider: { height: 21, width: 1, backgroundColor: colors.line, marginHorizontal: 1 },
  regionChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#F0F1EA' },
  regionChipSelected: { backgroundColor: colors.leaf },
  regionText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  regionTextSelected: { color: colors.ink, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 21, marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 21, lineHeight: 26 },
  sectionSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
  sortButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 17, backgroundColor: '#EFF1EA' },
  sortText: { color: colors.inkSoft, fontSize: 10, fontWeight: '700' },
  chevronReversed: { transform: [{ rotate: '180deg' }] },
  list: { marginTop: 2 },
  observationCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 10, borderRadius: 17, backgroundColor: colors.white },
  rowPressed: { opacity: 0.8 },
  observationImage: { width: 72, height: 72, borderRadius: 11, backgroundColor: colors.leaf },
  imageFallback: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#E7ECE3' },
  observationCopy: { flex: 1, minWidth: 0, paddingHorizontal: 11 },
  observationTitleRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 6 },
  observationName: { flexShrink: 1, color: colors.ink, fontSize: 14, fontWeight: '700' },
  newBadge: { overflow: 'hidden', color: colors.ink, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5, backgroundColor: colors.leafDeep },
  scientificName: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  observationMeta: { color: colors.inkSoft, fontSize: 10, marginTop: 7 },
  unknownMarker: { position: 'absolute', left: 10, bottom: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.coral },
  empty: { alignItems: 'center', paddingHorizontal: 22, paddingVertical: 26, marginTop: 2, borderRadius: 18, backgroundColor: colors.white },
  emptyIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#E7ECE3' },
  emptyTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 19, textAlign: 'center', marginTop: 12 },
  emptyCopy: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  browseButton: { minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, marginTop: 15, borderRadius: 21, backgroundColor: colors.ink },
  browseText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  discoveryPrompt: { flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 12, borderRadius: 17, backgroundColor: '#E8EEE4' },
  discoveryPressed: { opacity: 0.8 },
  promptIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#D5E1D2' },
  promptCopy: { flex: 1, minWidth: 0, marginHorizontal: 11 },
  promptEyebrow: { color: colors.inkSoft, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  promptTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 14, marginTop: 3 },
  promptBody: { color: colors.muted, fontSize: 10, marginTop: 3 },
  localNote: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 16 },
});
