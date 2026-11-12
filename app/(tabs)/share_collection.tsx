import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  Globe2,
  Link2,
  MoreHorizontal,
  ShieldCheck,
  Share2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { birdImages } from '../../src/data/bird-images';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import type { BirdObservation } from '../../src/services/collection';
import { colors } from '../../src/theme';

const collectionUrl = 'https://wingdex.app/c/wingdex-birder';
const qrCells = [
  '1111111001101111111', '1000001010101000001', '1011101011011011101',
  '1011101000111011101', '1011101010111011101', '1000001011011000001',
  '1111111010101111111', '0000000011000000000', '1110111010111010011',
  '0011010001100101100', '1100101110011110011', '0111010001110010100',
  '1010111010101111011', '0000000011010001010', '1111111010111010111',
  '1000001001100011100', '1011101010111010111', '1011101001001001000',
  '1111111011111010111',
];

function observationTime(observation: BirdObservation) {
  const timestamp = new Date(observation.identifiedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function QrMark() {
  return (
    <View style={styles.qr} accessible accessibilityLabel="Collection QR code">
      {qrCells.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.qrRow}>
          {[...row].map((cell, columnIndex) => (
            <View key={columnIndex} style={[styles.qrCell, cell === '1' && styles.qrCellFilled]} />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ShareCollectionScreen() {
  const { observations, storageError } = useSavedBirds();
  const [hideLocations, setHideLocations] = useState(true);
  const [accessOpen, setAccessOpen] = useState(false);
  const [access, setAccess] = useState<'Anyone with the link' | 'Only me'>('Anyone with the link');
  const [copied, setCopied] = useState(false);

  const speciesCount = useMemo(() => new Set(
    observations
      .filter((observation) => observation.commonName || observation.scientificName)
      .map((observation) => (observation.scientificName || observation.commonName || '').trim().toLowerCase())
      .filter(Boolean)
  ).size, [observations]);

  const newestObservation = useMemo(
    () => [...observations].sort((left, right) => observationTime(right) - observationTime(left))[0],
    [observations]
  );
  const previewImage = newestObservation?.photoUri
    ? { uri: newestObservation.photoUri }
    : birdImages['palawan-peacock-pheasant'];

  const shareMessage = `Explore my WingDex life list: ${collectionUrl}`;
  const handleShare = () => void Share.share({ message: shareMessage, url: collectionUrl }).catch(() => undefined);
  const handleCopy = async () => {
    await Clipboard.setStringAsync(collectionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const chooseAccess = (value: 'Anyone with the link' | 'Only me') => {
    setAccess(value);
    setAccessOpen(false);
  };
  const saveCard = () => Alert.alert('Save card unavailable', 'Image capture is not available on this device yet. You can still share or copy your collection link.');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft color={colors.ink} size={25} />
          </Pressable>
          <Text style={styles.headerTitle}>Share collection</Text>
          <Pressable onPress={() => setAccessOpen((open) => !open)} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="More sharing options">
            <MoreHorizontal color={colors.ink} size={25} />
          </Pressable>
        </View>

        <View style={styles.intro}>
          <Text style={styles.title}>Let your discoveries travel.</Text>
          <Text style={styles.subtitle}>Share your life list with your kind of people.</Text>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.photoWrap}>
            <Image source={previewImage} style={styles.previewImage} accessibilityLabel="Featured bird from your collection" />
            <View style={styles.brandBadge}><Link2 color="#D9E7A9" size={18} /><Text style={styles.brandText}>WingDex</Text></View>
          </View>
          <View style={styles.previewFooter}>
            <View style={styles.previewCopy}>
              <Text style={styles.listName}>My life list</Text>
              <Text style={styles.listMeta}>{speciesCount} {speciesCount === 1 ? 'species' : 'species'} · {observations.length} {observations.length === 1 ? 'sighting' : 'sightings'}</Text>
              <Text style={styles.handle}>@wingdex.birder · Field journal</Text>
            </View>
            <QrMark />
          </View>
        </View>

        {storageError && <Text accessibilityRole="alert" style={styles.error}>Your collection is temporarily unavailable. The card will update when it can be read.</Text>}

        <View style={styles.settingsCard}>
          <Pressable onPress={() => setAccessOpen((open) => !open)} style={styles.settingRow} accessibilityRole="button" accessibilityLabel="Change collection access">
            <Globe2 color={colors.inkSoft} size={27} />
            <View style={styles.settingCopy}><Text style={styles.settingTitle}>{access}</Text><Text style={styles.settingDetail}>{access === 'Anyone with the link' ? 'View only · No account needed' : 'Only you can view this collection'}</Text></View>
            <ChevronDown color={colors.ink} size={24} style={accessOpen ? styles.rotated : undefined} />
          </Pressable>
          {accessOpen && (
            <View style={styles.accessMenu}>
              {(['Anyone with the link', 'Only me'] as const).map((item) => <Pressable key={item} onPress={() => chooseAccess(item)} style={styles.accessOption} accessibilityRole="radio" accessibilityState={{ selected: access === item }}><Text style={styles.accessText}>{item}</Text>{access === item && <Check color={colors.inkSoft} size={18} />}</Pressable>)}
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <ShieldCheck color={colors.inkSoft} size={28} />
            <View style={styles.settingCopy}><Text style={styles.settingTitle}>Hide exact locations</Text><Text style={styles.settingDetail}>Protect birds. Share general areas only.</Text></View>
            <Switch value={hideLocations} onValueChange={setHideLocations} trackColor={{ false: '#C5CEC5', true: colors.inkSoft }} thumbColor={colors.white} accessibilityLabel="Hide exact locations" />
          </View>
        </View>

        <View style={styles.urlCard}><Link2 color={colors.inkSoft} size={26} /><Text numberOfLines={1} style={styles.url}>{collectionUrl.replace('https://', '')}</Text><Pressable onPress={handleCopy} hitSlop={8} accessibilityRole="button" accessibilityLabel="Copy collection link">{copied ? <Check color={colors.inkSoft} size={25} /> : <Copy color={colors.inkSoft} size={25} />}</Pressable></View>
        {copied && <Text style={styles.copiedNote}>Link copied to clipboard</Text>}

        <Pressable onPress={handleShare} style={({ pressed }) => [styles.shareCta, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Share collection"><Share2 color={colors.white} size={26} /><Text style={styles.shareCtaText}>Share collection</Text></Pressable>
        <View style={styles.secondaryActions}>
          <Pressable onPress={handleCopy} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} accessibilityRole="button"><Link2 color={colors.inkSoft} size={27} /><Text style={styles.secondaryText}>Copy link</Text></Pressable>
          <Pressable onPress={saveCard} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} accessibilityRole="button"><Download color={colors.inkSoft} size={27} /><Text style={styles.secondaryText}>Save card</Text></Pressable>
        </View>
        <Text style={styles.note}>Your shared life list updates as your collection grows.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28 },
  header: { height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: colors.white },
  headerTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 27, fontWeight: '700' },
  intro: { marginTop: 13, marginBottom: 14 }, title: { color: colors.ink, fontFamily: 'Georgia', fontSize: 30, lineHeight: 37 }, subtitle: { color: colors.muted, fontSize: 15, fontWeight: '600', marginTop: 6 },
  previewCard: { overflow: 'hidden', borderRadius: 27, backgroundColor: colors.white, shadowColor: '#1B2E26', shadowOpacity: 0.14, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  photoWrap: { height: 300, backgroundColor: colors.leaf }, previewImage: { width: '100%', height: '100%', resizeMode: 'cover' }, brandBadge: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 15, height: 48, borderRadius: 24, backgroundColor: '#1B4A3A' }, brandText: { color: colors.white, fontSize: 18 },
  previewFooter: { minHeight: 160, flexDirection: 'row', alignItems: 'center', padding: 25 }, previewCopy: { flex: 1, minWidth: 0 }, listName: { color: colors.ink, fontFamily: 'Georgia', fontSize: 29, lineHeight: 35 }, listMeta: { color: colors.muted, fontSize: 15, marginTop: 11 }, handle: { color: colors.inkSoft, fontSize: 14, marginTop: 10 },
  qr: { width: 90, height: 90, marginLeft: 12 }, qrRow: { flex: 1, flexDirection: 'row' }, qrCell: { flex: 1 }, qrCellFilled: { backgroundColor: colors.inkSoft },
  settingsCard: { marginTop: 28, paddingHorizontal: 20, borderRadius: 27, backgroundColor: colors.white, borderWidth: 1, borderColor: '#EDF0E9' }, settingRow: { minHeight: 109, flexDirection: 'row', alignItems: 'center', gap: 16 }, settingCopy: { flex: 1, minWidth: 0 }, settingTitle: { color: colors.ink, fontSize: 19, fontWeight: '700' }, settingDetail: { color: colors.muted, fontSize: 14, marginTop: 6, lineHeight: 20 }, divider: { height: 1, backgroundColor: colors.line }, rotated: { transform: [{ rotate: '180deg' }] }, accessMenu: { marginTop: -8, marginBottom: 5, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 5 }, accessOption: { minHeight: 41, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }, accessText: { color: colors.inkSoft, fontSize: 14, fontWeight: '600' },
  urlCard: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 22, marginTop: 28, borderRadius: 17, backgroundColor: '#E8F0E5' }, url: { flex: 1, color: colors.inkSoft, fontSize: 17 }, copiedNote: { color: colors.inkSoft, fontSize: 12, textAlign: 'center', marginTop: 7 },
  shareCta: { minHeight: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginTop: 27, borderRadius: 17, backgroundColor: '#246347' }, shareCtaText: { color: colors.white, fontSize: 21 }, secondaryActions: { flexDirection: 'row', gap: 18, marginTop: 28 }, secondaryButton: { flex: 1, minHeight: 91, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.white }, secondaryText: { color: colors.inkSoft, fontSize: 19 }, note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 29 }, error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 12 }, pressed: { opacity: 0.72 },
});
