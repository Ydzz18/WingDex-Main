import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Footprints, MapPin, Navigation } from 'lucide-react-native';
import { WalkingRouteMap } from '../../src/components/WalkingRouteMap';
import type { WalkingRoute } from '../../src/services/walkingDirections';
import { getWalkingRoute } from '../../src/services/walkingDirections';
import { colors } from '../../src/theme';

function parseCoordinate(value: string | string[] | undefined, min: number, max: number): number | null {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m`
    : `${distanceKm.toFixed(1)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} hr ${remainingMinutes} min` : `${hours} hr`;
}

export default function DirectionsScreen() {
  const params = useLocalSearchParams<{
    originLat?: string;
    originLng?: string;
    destinationLat?: string;
    destinationLng?: string;
    destinationName?: string;
  }>();
  const origin = useMemo(() => {
    const latitude = parseCoordinate(params.originLat, -90, 90);
    const longitude = parseCoordinate(params.originLng, -180, 180);
    return latitude === null || longitude === null ? null : { latitude, longitude };
  }, [params.originLat, params.originLng]);
  const destination = useMemo(() => {
    const latitude = parseCoordinate(params.destinationLat, -90, 90);
    const longitude = parseCoordinate(params.destinationLng, -180, 180);
    return latitude === null || longitude === null ? null : { latitude, longitude };
  }, [params.destinationLat, params.destinationLng]);
  const destinationName = Array.isArray(params.destinationName)
    ? params.destinationName[0]
    : params.destinationName;
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(origin && destination));
  const missingLocationMessage = !origin || !destination
    ? 'The starting point or bird sighting location is missing. Return to Nearby and try again.'
    : null;

  useEffect(() => {
    let active = true;
    if (!origin || !destination) return () => { active = false; };
    void getWalkingRoute(origin, destination)
      .then((result) => {
        if (active) setRoute(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : 'Walking directions could not be loaded. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [destination, origin]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Return to nearby sightings"
          >
            <ArrowLeft color={colors.ink} size={20} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>WINGDEX MAP</Text>
            <Text style={styles.title}>Walking directions</Text>
          </View>
          <Footprints color={colors.inkSoft} size={21} />
        </View>

        <View style={styles.destinationCard}>
          <MapPin color={colors.coral} size={18} />
          <View style={styles.destinationCopy}>
            <Text style={styles.destinationEyebrow}>BIRD SIGHTING</Text>
            <Text style={styles.destinationName} numberOfLines={2}>{destinationName || 'Selected sighting'}</Text>
          </View>
          {route && (
            <View style={styles.routeSummary}>
              <Text style={styles.routeDistance}>{formatDistance(route.distanceKm)}</Text>
              <Text style={styles.routeDuration}>{formatDuration(route.durationSeconds)}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.statusCard} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.inkSoft} />
            <Text style={styles.statusText}>Finding a walking route…</Text>
          </View>
        ) : missingLocationMessage || error ? (
          <View style={styles.statusCard} accessibilityLiveRegion="polite">
            <Text style={styles.errorTitle}>Route unavailable</Text>
            <Text style={styles.statusText}>{missingLocationMessage ?? error}</Text>
            <Text style={styles.statusHint}>Check your connection or try another nearby sighting.</Text>
          </View>
        ) : route && origin && destination ? (
          <>
            <WalkingRouteMap origin={origin} destination={destination} route={route} />
            <View style={styles.stepsCard}>
              <View style={styles.stepsHeading}>
                <Navigation color={colors.inkSoft} size={17} />
                <Text style={styles.stepsTitle}>Route steps</Text>
              </View>
              {route.instructions.length > 0 ? route.instructions.map((instruction, index) => (
                <View key={`${index}-${instruction}`} style={styles.stepRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
                  <Text style={styles.stepText}>{instruction}</Text>
                </View>
              )) : (
                <Text style={styles.statusText}>Follow the highlighted pedestrian route to the sighting.</Text>
              )}
            </View>
            <Text style={styles.attribution}>
              Walking route calculated with OpenStreetMap pedestrian data. Follow local signs and use safe, public paths.
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.inkSoft, fontSize: 9, lineHeight: 12, letterSpacing: 1.4, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '800' },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 14,
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  destinationCopy: { flex: 1, minWidth: 0 },
  destinationEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  destinationName: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 2 },
  routeSummary: { alignItems: 'flex-end' },
  routeDistance: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  routeDuration: { color: colors.muted, fontSize: 11, marginTop: 2 },
  statusCard: {
    minHeight: 120,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  statusText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  errorTitle: { color: colors.coral, fontSize: 16, fontWeight: '800' },
  statusHint: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  stepsCard: { padding: 16, borderRadius: 18, backgroundColor: colors.white },
  stepsHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  stepsTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9 },
  stepNumber: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#E8EEE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  stepText: { flex: 1, color: colors.inkSoft, fontSize: 13, lineHeight: 20 },
  attribution: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 8 },
});
