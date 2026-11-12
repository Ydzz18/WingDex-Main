import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  Bird,
  CheckCircle2,
  Clock3,
  Footprints,
  MapPin,
  Navigation,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NearbyMap } from '../../src/components/NearbyMap';
import { PageHeader, PageHeaderAction } from '../../src/components/PageHeader';
import type { NearbyMapSighting } from '../../src/components/nearbyMapTypes';
import {
  getEbirdChecklists,
  getNearbyEbirdHotspots,
  getNearbyEbirdObservations,
  getRegionalEbirdObservations,
  type EbirdChecklist,
  type EbirdHotspot,
  type EbirdObservation,
} from '../../src/services/ebird';
import { getCurrentLocation, type UserLocation } from '../../src/services/location';
import { colors } from '../../src/theme';

function toSighting(observation: EbirdObservation, location: UserLocation): NearbyMapSighting {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDifference = radians(observation.lat - location.latitude);
  const longitudeDifference = radians(observation.lng - location.longitude);
  const a = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(location.latitude)) * Math.cos(radians(observation.lat))
    * Math.sin(longitudeDifference / 2) ** 2;
  const distanceKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const observedAt = new Date(observation.obsDt);
  const time = Number.isNaN(observedAt.getTime())
    ? observation.obsDt
    : observedAt.toLocaleString();
  return {
    id: `${observation.locId ?? 'location'}-${observation.speciesCode}-${observation.obsDt}`,
    name: observation.comName,
    scientificName: observation.sciName,
    latitude: observation.lat,
    longitude: observation.lng,
    distance: distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`,
    time,
    note: `${observation.howMany ?? 'One or more'} reported${observation.locName ? ` at ${observation.locName}` : ''}.`,
    observer: 'eBird observation',
  };
}

function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function NearbyScreen() {
  const [sightings, setSightings] = useState<NearbyMapSighting[]>([]);
  const [hotspots, setHotspots] = useState<EbirdHotspot[]>([]);
  const [checklists, setChecklists] = useState<EbirdChecklist[]>([]);
  const [regionalObservations, setRegionalObservations] = useState<EbirdObservation[]>([]);
  const [checklistRegionCode, setChecklistRegionCode] = useState('');
  const [loadingChecklists, setLoadingChecklists] = useState(false);
  const [selectedSightingId, setSelectedSightingId] = useState('');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const selectedSighting = sightings.find((sighting) => sighting.id === selectedSightingId);

  const requestLocation = async () => {
    setRequestingLocation(true);
    setLocationError(null);
    setDataError(null);
    setSightings([]);
    setHotspots([]);
    setChecklists([]);
    setRegionalObservations([]);
    try {
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      const [observationResult, hotspotResult] = await Promise.allSettled([
        getNearbyEbirdObservations(currentLocation),
        getNearbyEbirdHotspots(currentLocation),
      ]);
      const errors: string[] = [];
      if (observationResult.status === 'fulfilled') {
        const nextSightings = observationResult.value.map((item) => toSighting(item, currentLocation));
        setSightings(nextSightings);
        setSelectedSightingId(nextSightings[0]?.id ?? '');
      } else {
        setSightings([]);
        errors.push(observationResult.reason instanceof Error ? observationResult.reason.message : 'Could not load eBird sightings.');
      }
      if (hotspotResult.status === 'fulfilled') {
        const nextHotspots = hotspotResult.value;
        setHotspots(nextHotspots);
        const regionCode = nextHotspots.find((hotspot) => hotspot.subnational1Code)?.subnational1Code;
        if (regionCode) {
          setChecklistRegionCode(regionCode);
          await loadChecklists(regionCode);
        }
      } else {
        setHotspots([]);
        errors.push(hotspotResult.reason instanceof Error ? hotspotResult.reason.message : 'Could not load eBird hotspots.');
      }
      if (errors.length) setDataError(errors.join(' '));
    } catch (error) {
      setLocationError(
        error instanceof Error ? error.message : 'Could not get your location. Please try again.',
      );
    } finally {
      setRequestingLocation(false);
    }
  };

  const loadChecklists = async (regionCode = checklistRegionCode) => {
    const normalizedRegion = regionCode.trim().toUpperCase();
    if (!normalizedRegion) {
      setDataError('Enter an eBird region code (for example, US-CA) to view today’s checklists.');
      return;
    }
    setChecklistRegionCode(normalizedRegion);
    setLoadingChecklists(true);
    setDataError(null);
    try {
      const [checklistResult, observationResult] = await Promise.allSettled([
        getEbirdChecklists(normalizedRegion, todayDate()),
        getRegionalEbirdObservations(normalizedRegion),
      ]);
      const errors: string[] = [];
      if (checklistResult.status === 'fulfilled') setChecklists(checklistResult.value);
      else {
        setChecklists([]);
        errors.push(checklistResult.reason instanceof Error ? checklistResult.reason.message : 'Could not load checklists.');
      }
      if (observationResult.status === 'fulfilled') setRegionalObservations(observationResult.value);
      else {
        setRegionalObservations([]);
        errors.push(observationResult.reason instanceof Error ? observationResult.reason.message : 'Could not load regional sightings.');
      }
      if (errors.length) setDataError(errors.join(' '));
    } catch (error) {
      setChecklists([]);
      setRegionalObservations([]);
      setDataError(error instanceof Error ? error.message : 'Could not load eBird checklists.');
    } finally {
      setLoadingChecklists(false);
    }
  };

  const openDirections = async () => {
    if (!selectedSighting) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSighting.latitude},${selectedSighting.longitude}&travelmode=walking`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open directions', 'Please try again or open your maps app.');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="Nearby"
          subtitle="A little closer to the wild"
          accessory={
            <PageHeaderAction
              onPress={() => router.push('/notifications')}
              accessibilityLabel="Open notifications"
            >
              <Bell color={colors.ink} size={21} strokeWidth={2} />
              <View style={styles.notificationDot} />
            </PageHeaderAction>
          }
        />

        <Pressable
          style={({ pressed }) => [styles.locationPanel, pressed && styles.pressed]}
          onPress={() => void requestLocation()}
          disabled={requestingLocation}
          accessibilityRole="button"
          accessibilityLabel="Share approximate location with eBird to load nearby sightings and hotspots"
        >
          <View style={styles.locationIcon}>
            {requestingLocation ? (
              <ActivityIndicator color={colors.inkSoft} size="small" />
            ) : (
              <MapPin color={colors.inkSoft} size={18} strokeWidth={2.2} />
            )}
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationName}>
              {location ? 'Your location' : 'Use my location'}
            </Text>
            <Text style={styles.locationMeta}>
              {location
                ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                : 'Tap to share approximate location with eBird for nearby data'}
            </Text>
          </View>
          <Navigation color={colors.inkSoft} size={18} />
        </Pressable>
        {locationError && <Text style={styles.locationError}>{locationError}</Text>}

        <View style={styles.mapHeading}>
          <View>
            <Text style={styles.sectionEyebrow}>EBIRD DATA</Text>
            <Text style={styles.mapTitle}>Recent sightings nearby</Text>
          </View>
          <View style={styles.mapBadge}>
            <View style={styles.mapDot} />
            <Text style={styles.mapBadgeText}>OPEN MAP</Text>
          </View>
        </View>

        <NearbyMap
          location={location}
          sightings={sightings}
          selectedSightingId={selectedSightingId}
          onSelectSighting={setSelectedSightingId}
        />

        {requestingLocation && <ActivityIndicator color={colors.inkSoft} style={styles.loading} />}
        {dataError && <Text style={styles.locationError}>{dataError}</Text>}
        {!requestingLocation && location && sightings.length === 0 && !dataError && (
          <Text style={styles.emptyState}>No recent eBird observations were found within 25 km.</Text>
        )}

        {selectedSighting && <View style={styles.sightingCard}>
          <View style={styles.sightingTop}>
            <View style={styles.birdArtwork}>
              <View style={styles.artworkHalo} />
              <Bird color={colors.coral} size={34} strokeWidth={1.8} />
              <View style={styles.artworkCaption}>
                <Text style={styles.artworkCaptionText}>FIELD</Text>
              </View>
            </View>
            <View style={styles.sightingInfo}>
              <Text style={styles.cardEyebrow}>SPOTTED NEARBY</Text>
              <Text style={styles.speciesName}>{selectedSighting.name}</Text>
              <Text style={styles.scientificName}>{selectedSighting.scientificName}</Text>
              <View style={styles.sightingMeta}>
                <View style={styles.metaItem}>
                  <MapPin color={colors.muted} size={13} />
                  <Text style={styles.metaText}>{selectedSighting.distance}</Text>
                </View>
                <View style={styles.metaSeparator} />
                <View style={styles.metaItem}>
                  <Clock3 color={colors.muted} size={13} />
                  <Text style={styles.metaText}>{selectedSighting.time}</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.observationNote}>“{selectedSighting.note}”</Text>
          <View style={styles.communityRow}>
            <CheckCircle2 color={colors.inkSoft} size={15} strokeWidth={2.2} />
            <Text style={styles.observerText}>{selectedSighting.observer}</Text>
          </View>
          <Pressable
            onPress={() => void openDirections()}
            style={({ pressed }) => [styles.directionsButton, pressed && styles.buttonPressed]}
            accessibilityRole="link"
            accessibilityLabel={`Get walking directions to ${selectedSighting.name} sighting`}
          >
            <Footprints color={colors.white} size={18} strokeWidth={2.2} />
            <Text style={styles.directionsText}>Get walking directions</Text>
            <Navigation color={colors.white} size={17} strokeWidth={2} />
          </Pressable>
        </View>}

        <View style={styles.dataSection}>
          <Text style={styles.mapTitle}>eBird hotspots</Text>
          {hotspots.length === 0
            ? <Text style={styles.emptyState}>Hotspots appear after you share your location.</Text>
            : hotspots.slice(0, 8).map((hotspot) => (
              <Pressable
                key={hotspot.locId}
                onPress={() => {
                  const url = `https://ebird.org/hotspot/${encodeURIComponent(hotspot.locId)}`;
                  void Linking.openURL(url).catch(() => {
                    Alert.alert('Could not open hotspot', 'Please try again.');
                  });
                }}
                style={styles.hotspotRow}
                accessibilityRole="link"
                accessibilityLabel={`Open eBird hotspot ${hotspot.name}`}
              >
                <MapPin color={colors.inkSoft} size={17} />
                <View style={styles.hotspotCopy}>
                  <Text style={styles.hotspotName}>{hotspot.name}</Text>
                  <Text style={styles.hotspotMeta}>
                    {hotspot.numSpeciesAllTime !== undefined
                      ? `${hotspot.numSpeciesAllTime} species recorded`
                      : 'View hotspot details on eBird'}
                  </Text>
                </View>
                <Navigation color={colors.muted} size={15} />
              </Pressable>
            ))}
        </View>

        <View style={styles.dataSection}>
          <Text style={styles.mapTitle}>Regional eBird activity</Text>
          <Text style={styles.checklistNote}>Recent sightings and today’s public checklists. Enter a region code, such as US-CA or GB-ENG.</Text>
          <View style={styles.checklistSearch}>
            <TextInput
              value={checklistRegionCode}
              onChangeText={setChecklistRegionCode}
              placeholder="Region code"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              accessibilityLabel="eBird region code"
              style={styles.regionInput}
            />
            <Pressable
              onPress={() => void loadChecklists()}
              disabled={loadingChecklists}
              style={({ pressed }) => [styles.checklistButton, pressed && styles.buttonPressed]}
              accessibilityRole="button"
              accessibilityLabel="Load today's regional checklists"
            >
              {loadingChecklists
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.checklistButtonText}>Load</Text>}
            </Pressable>
          </View>
          {regionalObservations.slice(0, 10).map((observation) => (
            <View key={`${observation.speciesCode}-${observation.obsDt}-${observation.locId}`} style={styles.hotspotRow}>
              <Bird color={colors.inkSoft} size={17} />
              <View style={styles.hotspotCopy}>
                <Text style={styles.hotspotName}>{observation.comName}</Text>
                <Text style={styles.hotspotMeta}>
                  {(observation.locName ?? checklistRegionCode) || 'eBird region'} · {observation.obsDt}
                </Text>
              </View>
            </View>
          ))}
          {regionalObservations.length === 0 && !loadingChecklists && (
            <Text style={styles.emptyState}>No recent regional observations loaded.</Text>
          )}
          {checklists.slice(0, 10).map((checklist) => (
            <Pressable
              key={checklist.subId}
              onPress={() => {
                void Linking.openURL(`https://ebird.org/checklist/${encodeURIComponent(checklist.subId)}`).catch(() => {
                  Alert.alert('Could not open checklist', 'Please try again.');
                });
              }}
              style={styles.hotspotRow}
              accessibilityRole="link"
              accessibilityLabel={`Open eBird checklist at ${checklist.locName ?? 'a location'}`}
            >
              <CheckCircle2 color={colors.inkSoft} size={17} />
              <View style={styles.hotspotCopy}>
                <Text style={styles.hotspotName}>{checklist.locName ?? 'eBird checklist'}</Text>
                <Text style={styles.hotspotMeta}>
                  {checklist.numSpecies !== undefined ? `${checklist.numSpecies} species · ` : ''}
                  {checklist.obsDt}
                </Text>
              </View>
              <Navigation color={colors.muted} size={15} />
            </Pressable>
          ))}
          {checklists.length === 0 && regionalObservations.length === 0 && !loadingChecklists && (
            <Text style={styles.emptyState}>No recent observations or checklists loaded for this region today.</Text>
          )}
        </View>

        <View style={styles.mapFooter}>
          <MapPin color={colors.inkSoft} size={14} />
          <Text style={styles.footerText}>
            eBird data is provided by Cornell Lab. Approximate coordinates are sent to eBird for nearby results and are not saved by Wingdex.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 44,
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.coral,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  locationPanel: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFF0EA',
    marginBottom: 8,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#EDF2EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  locationCopy: { flex: 1 },
  locationName: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  locationMeta: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 1 },
  locationError: { color: colors.coral, fontSize: 11, lineHeight: 16, marginBottom: 12 },
  mapHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  sectionEyebrow: { color: colors.inkSoft, fontSize: 9, lineHeight: 12, letterSpacing: 1.5, fontWeight: '800' },
  mapTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: -0.3, marginTop: 2 },
  mapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#E8EEE4',
    marginBottom: 2,
  },
  mapDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: colors.inkSoft },
  mapBadgeText: { color: colors.inkSoft, fontSize: 8, lineHeight: 10, letterSpacing: 0.8, fontWeight: '800' },
  sightingCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    shadowColor: '#2D4135',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sightingTop: { flexDirection: 'row', alignItems: 'center' },
  birdArtwork: {
    width: 66,
    height: 70,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#F7E5DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  artworkHalo: { position: 'absolute', width: 47, height: 47, borderRadius: 24, backgroundColor: '#F1D3C3', top: 9, left: 10 },
  artworkCaption: { position: 'absolute', bottom: 5, alignSelf: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.62)' },
  artworkCaptionText: { color: colors.coral, fontSize: 6, letterSpacing: 1, fontWeight: '800' },
  sightingInfo: { flex: 1, minWidth: 0 },
  cardEyebrow: { color: colors.inkSoft, fontSize: 8, lineHeight: 11, letterSpacing: 1, fontWeight: '800', marginBottom: 2 },
  speciesName: { color: colors.ink, fontSize: 17, lineHeight: 21, fontWeight: '800', letterSpacing: -0.4 },
  scientificName: { color: colors.muted, fontSize: 10, lineHeight: 14, fontStyle: 'italic' },
  sightingMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 7 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  metaSeparator: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#B9C2B9' },
  observationNote: { color: colors.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 10, marginBottom: 9 },
  communityRow: { flexDirection: 'row', alignItems: 'center', minHeight: 19, marginBottom: 11, gap: 5 },
  observerText: { color: colors.inkSoft, fontSize: 10, fontWeight: '700' },
  communityDivider: { width: 1, height: 13, backgroundColor: colors.line, marginHorizontal: 3 },
  birderCount: { color: colors.muted, fontSize: 9, fontWeight: '600', marginLeft: 1 },
  directionsButton: {
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonPressed: { backgroundColor: colors.inkSoft, transform: [{ scale: 0.99 }] },
  directionsText: { color: colors.white, fontSize: 12, fontWeight: '700', letterSpacing: 0.1 },
  mapFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  footerText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  loading: { marginVertical: 16 },
  emptyState: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 9 },
  dataSection: { marginTop: 24 },
  hotspotRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 7,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  hotspotCopy: { flex: 1, minWidth: 0 },
  hotspotName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  hotspotMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  checklistNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  checklistSearch: { flexDirection: 'row', gap: 8, marginTop: 10 },
  regionInput: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 12,
  },
  checklistButton: {
    minWidth: 70,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  checklistButtonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
