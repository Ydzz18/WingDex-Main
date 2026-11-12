import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bookmark, BookmarkCheck, ExternalLink, Music2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { birds, getBird, type Bird } from '../../src/data/birds';
import type { BirdObservation } from '../../src/services/collection';
import {
  getEbirdSpecies,
  getMacaulayAudioNameSearchUrl,
  getMacaulayAudioSearchUrl,
  type EbirdSpecies,
} from '../../src/services/ebird';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import { colors, rarityColors } from '../../src/theme';

export default function BirdDetailScreen() {
  const { id, locationUnavailable } = useLocalSearchParams<{
    id: string;
    locationUnavailable?: string;
  }>();
  const bird = getBird(id);
  const { savedIds, observations, toggle } = useSavedBirds();
  const [ebirdLookup, setEbirdLookup] = useState<{
    speciesCode: string;
    species?: EbirdSpecies;
    error?: string;
  } | null>(null);
  const observation = observations.find((item) => item.id === id);
  const ebirdSpeciesCode = !bird && !observation && id && /^[a-z0-9]{2,12}$/i.test(id) ? id : null;
  const activeEbirdLookup = ebirdSpeciesCode
    && ebirdLookup?.speciesCode.toLowerCase() === ebirdSpeciesCode.toLowerCase()
    ? ebirdLookup
    : null;
  const guideBird = observation && birds.find((item) =>
    item.scientificName.toLowerCase() === observation.scientificName?.toLowerCase() ||
    item.name.toLowerCase() === observation.commonName?.toLowerCase()
  );
  const saved = bird ? savedIds.includes(bird.id) : false;
  const identifiedObservation = bird && observations.find((observation) =>
    observation.photoUri && (
      observation.scientificName?.toLowerCase() === bird.scientificName.toLowerCase() ||
      observation.commonName?.toLowerCase() === bird.name.toLowerCase()
    )
  );

  useEffect(() => {
    if (!ebirdSpeciesCode) return;
    let active = true;
    getEbirdSpecies(ebirdSpeciesCode)
      .then((species) => {
        if (active) setEbirdLookup({ speciesCode: ebirdSpeciesCode, species });
      })
      .catch((error: unknown) => {
        if (active) {
          setEbirdLookup({
            speciesCode: ebirdSpeciesCode,
            error: error instanceof Error ? error.message : 'Could not load eBird species details.',
          });
        }
      });
    return () => { active = false; };
  }, [ebirdSpeciesCode]);

  if (activeEbirdLookup?.species) return <EbirdSpeciesDetail species={activeEbirdLookup.species} />;

  if (!bird && !observation) {
    return (
      <SafeAreaView style={styles.notFound} edges={['top', 'bottom']}>
        {ebirdSpeciesCode && !activeEbirdLookup
          ? <ActivityIndicator color={colors.inkSoft} />
          : <Text style={styles.notFoundTitle}>{activeEbirdLookup?.error ?? 'Bird not found'}</Text>}
        <Pressable onPress={() => router.back()} style={styles.backButton}><ArrowLeft color={colors.ink} size={18} /><Text style={styles.backLabel}>Go back</Text></Pressable>
      </SafeAreaView>
    );
  }

  if (!bird && observation) {
    return (
      <ObservationDetailView
        observation={observation}
        guideBird={guideBird}
        locationUnavailable={locationUnavailable === 'true'}
      />
    );
  }

  if (!bird) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
        <ArrowLeft color={colors.ink} size={19} />
        <Text style={styles.backLabel}>FIELD GUIDE</Text>
      </Pressable>
      {identifiedObservation?.photoUri ? (
        <Image source={{ uri: identifiedObservation.photoUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.unknownImage]}><Text style={styles.question}>?</Text></View>
      )}
      <View style={styles.titleBlock}>
        <Text style={styles.eyebrow}>PALAWAN / SPECIES RECORD</Text>
        <Text style={styles.title}>{bird.name}</Text>
        <Text style={styles.scientific}>{bird.scientificName}</Text>
        <View style={styles.badges}>
          <View style={[styles.rarityDot, { backgroundColor: rarityColors[bird.rarity] }]} />
          <Text style={styles.rarity}>{bird.rarity}</Text>
          <View style={styles.separator} />
          <Text style={styles.habitat}>{bird.habitat}</Text>
        </View>
      </View>

      <View style={styles.rule} />
      <Text style={styles.sectionLabel}>FIELD NOTE</Text>
      <Text style={styles.description}>{bird.description}</Text>
      <Text style={styles.provisional}>Rarity is a starter estimate and needs review against local sightings.</Text>

      <Pressable onPress={() => void toggle(bird.id)} style={styles.saveButton} accessibilityRole="button">
        {saved ? <BookmarkCheck color={colors.white} size={17} /> : <Bookmark color={colors.white} size={17} />}
        <Text style={styles.saveLabel}>{saved ? 'Remove from Pokedex' : 'Add to Pokedex'}</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          const url = getMacaulayAudioNameSearchUrl(bird.name);
          void Linking.openURL(url).catch(() => Alert.alert('Could not open recordings', 'Please try again.'));
        }}
        style={styles.audioButton}
        accessibilityRole="link"
      >
        <Music2 color={colors.inkSoft} size={17} />
        <Text style={styles.audioButtonText}>Find recordings in Macaulay Library</Text>
        <ExternalLink color={colors.inkSoft} size={14} />
      </Pressable>

      <View style={styles.creditBlock}>
        <Text style={styles.sectionLabel}>IMAGE CREDIT</Text>
        <Text style={styles.creditText}>{bird.imageCredit} · {bird.imageLicense}</Text>
        <Pressable onPress={() => void Linking.openURL(bird.imageSourceUrl)} style={styles.sourceLink} accessibilityRole="link">
          <Text style={styles.sourceLabel}>Wikimedia Commons</Text><ExternalLink color={colors.inkSoft} size={13} />
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(bird.sourceUrl)} style={styles.sourceLink} accessibilityRole="link">
          <Text style={styles.sourceLabel}>Species reference</Text><ExternalLink color={colors.inkSoft} size={13} />
        </Pressable>
      </View>
      <Text style={styles.localNote}>Photo attribution and license are shown with each image.</Text>
    </ScrollView>
    </SafeAreaView>
  );
}

function EbirdSpeciesDetail({ species }: { species: EbirdSpecies }) {
  const openLink = async (url: string, title: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Could not open ${title}`, 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft color={colors.ink} size={19} />
          <Text style={styles.backLabel}>EBIRD TAXONOMY</Text>
        </Pressable>
        <View style={[styles.image, styles.unknownImage]}>
          <Text style={styles.question}>?</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>WORLDWIDE SPECIES DATABASE</Text>
          <Text style={styles.title}>{species.comName}</Text>
          <Text style={styles.scientific}>{species.sciName}</Text>
          <View style={styles.badges}>
            <Text style={styles.rarity}>{species.familyComName ?? species.familySciName ?? 'Bird family unavailable'}</Text>
            <View style={styles.separator} />
            <Text style={styles.habitat}>{species.category}</Text>
          </View>
        </View>

        <View style={styles.rule} />
        <Text style={styles.sectionLabel}>TAXONOMY</Text>
        <View style={styles.taxonomyBlock}>
          <Text style={styles.taxonomyLabel}>SPECIES CODE</Text>
          <Text style={styles.taxonomyValue}>{species.speciesCode}</Text>
          {species.order && (
            <>
              <Text style={styles.taxonomyLabel}>ORDER</Text>
              <Text style={styles.taxonomyValue}>{species.order}</Text>
            </>
          )}
          {species.familySciName && (
            <>
              <Text style={styles.taxonomyLabel}>SCIENTIFIC FAMILY</Text>
              <Text style={styles.taxonomyValue}>{species.familySciName}</Text>
            </>
          )}
        </View>

        <Pressable
          onPress={() => void openLink(getMacaulayAudioSearchUrl(species.speciesCode), 'Macaulay Library recordings')}
          style={styles.saveButton}
          accessibilityRole="link"
        >
          <Music2 color={colors.white} size={17} />
          <Text style={styles.saveLabel}>Listen to Macaulay Library recordings</Text>
          <ExternalLink color={colors.white} size={15} />
        </Pressable>

        <Pressable
          onPress={() => void openLink(`https://ebird.org/species/${encodeURIComponent(species.speciesCode)}`, 'eBird species page')}
          style={styles.sourceLink}
          accessibilityRole="link"
        >
          <Text style={styles.sourceLabel}>More species information on eBird</Text>
          <ExternalLink color={colors.inkSoft} size={13} />
        </Pressable>
        <Text style={styles.provisional}>Taxonomy provided by eBird. Descriptions and recordings are hosted by the linked Cornell Lab services.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 35 },
  backButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  backLabel: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  image: { width: '100%', height: 255, backgroundColor: colors.leaf, borderWidth: 3, borderColor: colors.ink },
  unknownImage: { alignItems: 'center', justifyContent: 'center' },
  question: { color: colors.ink, fontFamily: 'Georgia', fontSize: 76, lineHeight: 84 },
  titleBlock: { padding: 14, marginTop: 0, backgroundColor: '#BBD5BD', borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 3, borderColor: colors.ink },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 27, lineHeight: 32, marginTop: 6 },
  scientific: { color: colors.muted, fontSize: 13, fontStyle: 'italic', marginTop: 5 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 },
  rarityDot: { width: 8, height: 8 },
  rarity: { color: colors.inkSoft, fontSize: 12, textTransform: 'capitalize' },
  separator: { width: 3, height: 3, backgroundColor: colors.muted, marginHorizontal: 2 },
  habitat: { color: colors.muted, fontSize: 12 },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 18 },
  sectionLabel: { color: colors.coral, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  description: { color: colors.ink, fontSize: 15, lineHeight: 23, marginTop: 8 },
  provisional: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 11 },
  saveButton: { minHeight: 48, backgroundColor: colors.ink, marginTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  saveLabel: { color: colors.white, fontSize: 13, fontWeight: '700' },
  creditBlock: { marginTop: 24, padding: 14, backgroundColor: colors.leaf },
  creditText: { color: colors.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 6 },
  taxonomyBlock: { marginTop: 11, padding: 14, backgroundColor: colors.leaf },
  taxonomyLabel: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 10 },
  taxonomyValue: { color: colors.ink, fontSize: 13, marginTop: 3 },
  audioButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  audioButtonText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  sourceLink: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7 },
  sourceLabel: { color: colors.ink, fontSize: 11, textDecorationLine: 'underline' },
  localNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 13, textAlign: 'center' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  notFoundTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 24 },
});

function ObservationDetailView({
  observation,
  guideBird,
  locationUnavailable,
}: {
  observation: BirdObservation;
  guideBird: Bird | undefined;
  locationUnavailable: boolean;
}) {
  const description = guideBird?.description ?? observation.description;
  const ebirdSpecies = observation.ebirdSpecies;
  const openLink = async (url: string, title: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(`Could not open ${title}`, 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={observationStyles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={observationStyles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft color={colors.ink} size={19} />
          <Text style={styles.backLabel}>POKEDEX</Text>
        </Pressable>
        <View style={observationStyles.device}>
          <View style={observationStyles.deviceTop}>
            <View style={observationStyles.lens} />
            <View style={observationStyles.indicators}><View style={observationStyles.indicator} /><View style={[observationStyles.indicator, observationStyles.dim]} /></View>
            <Text style={observationStyles.deviceCode}>SIGHTING RECORD</Text>
          </View>
          <View style={observationStyles.display}>
            {observation.photoUri ? (
              <Image source={{ uri: observation.photoUri }} style={observationStyles.observationImage} />
            ) : (
              <View style={observationStyles.placeholder}><Text style={observationStyles.question}>?</Text></View>
            )}
            <Text style={observationStyles.entryNumber}>FIELD ENTRY / {observation.id.slice(-6).toUpperCase()}</Text>
            <Text style={observationStyles.name}>{observation.commonName ?? 'Unidentified bird'}</Text>
            {observation.scientificName && <Text style={observationStyles.scientific}>{observation.scientificName}</Text>}
            <View style={observationStyles.rule} />
            <Text style={observationStyles.sectionLabel}>{guideBird ? 'FIELD GUIDE DESCRIPTION' : 'IDENTIFICATION NOTE'}</Text>
            <Text style={observationStyles.description}>{description ?? 'No species description was saved for this sighting.'}</Text>
            <View style={observationStyles.metaBlock}>
              <Text style={observationStyles.metaLabel}>RANGE</Text>
              <Text style={observationStyles.metaValue}>{observation.regions.join(', ') || 'Unknown'}</Text>
              <Text style={observationStyles.metaLabel}>RECORDED</Text>
              <Text style={observationStyles.metaValue}>{new Date(observation.identifiedAt).toLocaleString()}</Text>
              <Text style={observationStyles.metaLabel}>LOCATION</Text>
              <Text style={observationStyles.metaValue}>
                {observation.location
                  ? `${observation.location.latitude.toFixed(5)}, ${observation.location.longitude.toFixed(5)}`
                  : locationUnavailable
                    ? 'Location unavailable · sighting saved without coordinates'
                    : 'No location saved'}
              </Text>
              {observation.commonName && (
                <>
                  <Text style={observationStyles.metaLabel}>IDENTIFICATION CONFIDENCE</Text>
                  <Text style={observationStyles.metaValue}>{Math.round(observation.confidence * 100)}%</Text>
                </>
              )}
            </View>
            {ebirdSpecies && (
              <View style={observationStyles.ebirdBlock}>
                <Text style={observationStyles.sectionLabel}>EBIRD TAXONOMY</Text>
                <Text style={observationStyles.ebirdName}>{ebirdSpecies.comName}</Text>
                <Text style={observationStyles.scientific}>{ebirdSpecies.sciName}</Text>
                <Text style={observationStyles.metaValue}>
                  {ebirdSpecies.familyComName ?? ebirdSpecies.familySciName ?? 'Bird family unavailable'}
                  {' · '}{ebirdSpecies.category}
                </Text>
                <Pressable
                  onPress={() => void openLink(getMacaulayAudioSearchUrl(ebirdSpecies.speciesCode), 'Macaulay Library recordings')}
                  style={observationStyles.ebirdLink}
                  accessibilityRole="link"
                >
                  <Text style={observationStyles.ebirdLinkText}>Find audio recordings in Macaulay Library</Text>
                  <ExternalLink color={colors.inkSoft} size={13} />
                </Pressable>
                <Pressable
                  onPress={() => void openLink(`https://ebird.org/species/${encodeURIComponent(ebirdSpecies.speciesCode)}`, 'eBird species information')}
                  style={observationStyles.ebirdLink}
                  accessibilityRole="link"
                >
                  <Text style={observationStyles.ebirdLinkText}>Open species information on eBird</Text>
                  <ExternalLink color={colors.inkSoft} size={13} />
                </Pressable>
              </View>
            )}
            {observation.ebirdLookupError && (
              <Text style={observationStyles.ebirdWarning}>
                eBird species details could not be loaded: {observation.ebirdLookupError}
              </Text>
            )}
          </View>
        </View>
        <Text style={observationStyles.note}>Identification notes are generated from the submitted photo and may need verification.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const observationStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  device: { backgroundColor: colors.coral, borderWidth: 1, borderColor: colors.danger, borderBottomWidth: 4, borderBottomColor: colors.danger, padding: 11 },
  deviceTop: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 3, marginBottom: 8 },
  lens: { width: 17, height: 17, borderWidth: 2, borderColor: colors.coralPale, backgroundColor: '#4E9DB2' },
  indicators: { flexDirection: 'row', gap: 4 },
  indicator: { width: 6, height: 6, backgroundColor: colors.yellow },
  dim: { backgroundColor: colors.danger },
  deviceCode: { color: colors.coralPale, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginLeft: 'auto' },
  display: { borderWidth: 3, borderColor: colors.ink, backgroundColor: colors.leaf, padding: 12 },
  observationImage: { width: '100%', height: 225, backgroundColor: colors.leafDeep },
  placeholder: { height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leafDeep },
  question: { color: colors.ink, fontFamily: 'Georgia', fontSize: 55 },
  entryNumber: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 14 },
  name: { color: colors.ink, fontFamily: 'Georgia', fontSize: 24, lineHeight: 29, marginTop: 5 },
  scientific: { color: colors.inkSoft, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  rule: { height: 1, backgroundColor: colors.leafDeep, marginVertical: 16 },
  sectionLabel: { color: colors.coral, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  description: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 7 },
  metaBlock: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.leafDeep },
  metaLabel: { color: colors.inkSoft, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  metaValue: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 2 },
  ebirdBlock: { marginTop: 17, paddingTop: 13, borderTopWidth: 1, borderTopColor: colors.leafDeep },
  ebirdName: { color: colors.ink, fontFamily: 'Georgia', fontSize: 18, marginTop: 7 },
  ebirdLink: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7 },
  ebirdLinkText: { color: colors.ink, fontSize: 11, textDecorationLine: 'underline' },
  ebirdWarning: { color: colors.danger, fontSize: 11, lineHeight: 16, marginTop: 12 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 14 },
});