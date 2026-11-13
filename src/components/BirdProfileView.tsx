import { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bird as BirdIcon, Bookmark, Check, ExternalLink, Leaf, MapPin, Sun } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { birds } from '../data/birds';
import { getMacaulayAudioSearchUrl } from '../services/ebird';
import { colors } from '../theme';
import { useSavedBirds } from '../hooks/useSavedBirds';

type ProfileTab = 'overview' | 'habitat' | 'seasonality';

export default function BirdProfileScreen() {
  const { id, locationUnavailable } = useLocalSearchParams<{
    id?: string | string[];
    locationUnavailable?: string;
  }>();
  const observationId = Array.isArray(id) ? id[0] : id;
  const { observations, loaded, storageError } = useSavedBirds();
  const observation = observations.find((item) => item.id === observationId);
  const guideBird = observation && birds.find((bird) =>
    bird.scientificName.toLowerCase() === observation.scientificName?.toLowerCase()
      || bird.name.toLowerCase() === observation.commonName?.toLowerCase()
  );
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const heroHeight = Math.min(350, Math.max(245, width * 0.59));
  if (!observation) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.emptyState}>
          {loaded || storageError ? (
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyText}>
                {storageError ? 'Could not load this sighting.' : 'Sighting not found.'}
              </Text>
              <Pressable onPress={() => router.back()} accessibilityRole="button">
                <Text style={styles.emptyBack}>Go back</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator color={colors.leafDeep} />
          )}
        </View>
      </SafeAreaView>
    );
  }
  const commonName = observation.commonName ?? 'Unidentified bird';
  const observedDate = new Date(observation.identifiedAt);
  const formattedDate = Number.isNaN(observedDate.getTime())
    ? 'Date unavailable'
    : observedDate.toLocaleString();
  const locationText = observation.location
    ? `${observation.location.latitude.toFixed(5)}, ${observation.location.longitude.toFixed(5)}`
    : locationUnavailable === 'true'
      ? 'Unavailable · sighting saved without coordinates'
      : 'No location saved';
  const ebirdSpecies = observation.ebirdSpecies;
  const rangeText = observation.regions.filter((region) => region !== 'Unknown').join(', ') || 'Unknown';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft color={colors.ink} size={23} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.headerTitle}>Bird profile</Text>
        <Pressable
          style={styles.headerButton}
          onPress={() => router.push('/collection')}
          accessibilityRole="button"
          accessibilityLabel="Open your collection"
        >
          <Bookmark color={colors.leafDeep} fill={colors.leafDeep} size={22} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          {observation.photoUri ? (
            <Image source={{ uri: observation.photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <BirdIcon color={colors.leafDeep} size={48} />
              <Text style={styles.placeholderText}>No sighting photo</Text>
            </View>
          )}
          <View style={styles.heroLabel}>
            <Text style={styles.heroLabelText}>FIELD ENTRY · {observation.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.collectionBadge}>
            <Check color={colors.white} size={16} strokeWidth={3} />
            <Text style={styles.collectionText}>Saved sighting</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.nameBlock}>
              <Text style={styles.birdName}>{commonName}</Text>
              {observation.scientificName ? (
                <Text style={styles.scientificName}>{observation.scientificName}</Text>
              ) : null}
            </View>
            <View style={styles.status}>
              <Text style={styles.statusCode}>{Math.round(observation.confidence * 100)}%</Text>
              <Text style={styles.statusLabel}>confidence</Text>
            </View>
          </View>

          <View style={styles.measurements}>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Recorded</Text>
              <Text style={styles.measurementValue} numberOfLines={1}>
                {Number.isNaN(observedDate.getTime()) ? 'Unavailable' : observedDate.toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Range</Text>
              <Text style={styles.measurementValue} numberOfLines={1}>{rangeText}</Text>
            </View>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Location</Text>
              <Text style={styles.measurementValue} numberOfLines={1}>{observation.location ? 'Recorded' : 'Unavailable'}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
            accessibilityLabel="Bird profile sections"
          >
            {(['overview', 'habitat', 'seasonality'] as const).map((tab) => {
              const label = tab[0].toUpperCase() + tab.slice(1);
              const selected = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  style={[styles.tab, selected && styles.tabSelected]}
                  onPress={() => setActiveTab(tab)}
                  accessibilityRole="tab"
                  accessibilityLabel={`${label} section`}
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.section}>
            {activeTab === 'overview' ? (
              <>
                <Text style={styles.sectionTitle}>Identification notes</Text>
                <Text style={styles.bodyText}>
                  {guideBird?.description ?? observation.description ?? 'No identification description was saved for this sighting.'}
                </Text>
              </>
            ) : activeTab === 'habitat' ? (
              <>
                <View style={styles.sectionHeading}>
                  <Leaf color={colors.leafDeep} size={20} />
                  <Text style={styles.sectionTitle}>Habitat</Text>
                </View>
                <Text style={styles.bodyText}>
                  {guideBird?.habitat ?? (observation.ebirdSpecies
                    ? `${observation.ebirdSpecies.comName} belongs to the ${observation.ebirdSpecies.familyComName ?? observation.ebirdSpecies.familySciName ?? 'unknown'} family.`
                    : 'Habitat information is not available for this sighting yet.')}
                </Text>
              </>
            ) : (
              <>
                <View style={styles.sectionHeading}>
                  <Sun color={colors.leafDeep} size={20} />
                  <Text style={styles.sectionTitle}>Sighting record</Text>
                </View>
                <View style={styles.factLine}>
                  <Text style={styles.factLabel}>RECORDED</Text>
                  <Text style={styles.factValue}>{formattedDate}</Text>
                  <Text style={styles.factLabel}>LOCATION</Text>
                  <Text style={styles.factValue}>{locationText}</Text>
                  <Text style={styles.factLabel}>RANGE</Text>
                  <Text style={styles.factValue}>{rangeText}</Text>
                  <Text style={styles.factLabel}>IDENTIFICATION CONFIDENCE</Text>
                  <Text style={styles.factValue}>{Math.round(observation.confidence * 100)}%</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.audioCard}>
            <View style={styles.audioMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.audioMarkText}>♪</Text>
            </View>
            <View style={styles.audioDescription}>
              <Text style={styles.audioTitle}>Species record</Text>
              <Text style={styles.audioSubtitle}>
                {ebirdSpecies ? `${ebirdSpecies.category} · ${ebirdSpecies.sciName}` : 'eBird taxonomy not linked'}
              </Text>
            </View>
            <View style={styles.audioStatus}>
              <Text style={styles.audioStatusText}>{ebirdSpecies ? 'eBird' : 'Local'}</Text>
            </View>
          </View>
          {ebirdSpecies ? (
            <View style={styles.externalLinks}>
              <Pressable
                onPress={() => {
                  void Linking.openURL(getMacaulayAudioSearchUrl(ebirdSpecies.speciesCode))
                    .catch(() => Alert.alert('Could not open recordings', 'Please try again.'));
                }}
                style={styles.externalLink}
                accessibilityRole="link"
              >
                <Text style={styles.externalLinkText}>Find recordings in Macaulay Library</Text>
                <ExternalLink color={colors.inkSoft} size={14} />
              </Pressable>
              <Pressable
                onPress={() => {
                  void Linking.openURL(`https://ebird.org/species/${encodeURIComponent(ebirdSpecies.speciesCode)}`)
                    .catch(() => Alert.alert('Could not open eBird', 'Please try again.'));
                }}
                style={styles.externalLink}
                accessibilityRole="link"
              >
                <Text style={styles.externalLinkText}>Open species information on eBird</Text>
                <ExternalLink color={colors.inkSoft} size={14} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.spottedRow}>
            <MapPin color={colors.leafDeep} size={20} strokeWidth={2.5} />
            <Text style={styles.spottedText}>Recorded · {formattedDate}</Text>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteEyebrow}>SIGHTING LOCATION</Text>
            </View>
            <Text style={styles.noteText}>{locationText}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  emptyCopy: { alignItems: 'center', gap: 12 },
  emptyText: { color: colors.inkSoft, fontSize: 16, textAlign: 'center' },
  emptyBack: { color: colors.leafDeep, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: colors.paper,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollContent: { paddingBottom: 24 },
  hero: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: colors.leaf,
  },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#DDE8D9' },
  placeholderText: { color: colors.inkSoft, fontSize: 14, fontWeight: '600' },
  heroLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  heroLabelText: { color: colors.inkSoft, fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  collectionBadge: {
    position: 'absolute',
    left: 20,
    bottom: 18,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#23644A',
  },
  collectionText: { color: colors.white, fontSize: 14, fontWeight: '700' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nameBlock: { flex: 1, minWidth: 0 },
  birdName: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  scientificName: { color: colors.muted, fontSize: 17, fontStyle: 'italic', marginTop: 2 },
  status: { alignItems: 'flex-end', paddingLeft: 4 },
  statusCode: { color: colors.inkSoft, fontSize: 16, fontWeight: '600' },
  statusLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  measurements: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: '#E8EEE3',
    borderRadius: 18,
  },
  measurement: { flex: 1, minWidth: 0, alignItems: 'flex-start', paddingHorizontal: 3 },
  measurementLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  measurementValue: { color: colors.ink, fontSize: 16, fontWeight: '500', marginTop: 5 },
  tabRow: {
    minWidth: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: { minHeight: 42, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: colors.leafDeep },
  tabText: { color: colors.muted, fontSize: 15, fontWeight: '500' },
  tabTextSelected: { color: '#23644A', fontWeight: '800' },
  section: { paddingTop: 21, paddingBottom: 19, gap: 8 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 22, lineHeight: 29, fontWeight: '800', letterSpacing: -0.3 },
  bodyText: { color: colors.muted, fontSize: 16, lineHeight: 25 },
  factLine: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line, gap: 3 },
  factLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  factValue: { color: colors.inkSoft, fontSize: 14, fontWeight: '600' },
  audioCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E1E6DC',
  },
  audioMark: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEE3',
  },
  audioMarkText: { color: colors.inkSoft, fontSize: 24, lineHeight: 28 },
  audioDescription: { flex: 1, minWidth: 90, gap: 3 },
  audioTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  audioSubtitle: { color: colors.muted, fontSize: 12 },
  audioStatus: { maxWidth: 112, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F1F2EE' },
  audioStatusText: { color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  externalLinks: { paddingHorizontal: 4, paddingTop: 6 },
  externalLink: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 8 },
  externalLinkText: { color: colors.inkSoft, fontSize: 13, textDecorationLine: 'underline' },
  spottedRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 16 },
  spottedText: { flexShrink: 1, color: colors.muted, fontSize: 14 },
  noteCard: { padding: 17, backgroundColor: '#E8EEE3', borderRadius: 18, gap: 10 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteEyebrow: { color: '#477C61', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  noteText: { color: colors.inkSoft, fontSize: 15, lineHeight: 23, paddingRight: 22 },
});
