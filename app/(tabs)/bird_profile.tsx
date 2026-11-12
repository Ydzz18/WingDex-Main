import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ArrowLeft, Bookmark, Check, Leaf, MapPin, Pencil, Save, Sun, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/theme';

type ProfileTab = 'overview' | 'habitat' | 'seasonality';

function RobinIllustration() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 760 440" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="forestSky" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#d6e0cb" />
          <Stop offset="0.52" stopColor="#b9c9ad" />
          <Stop offset="1" stopColor="#e9ddc2" />
        </LinearGradient>
        <LinearGradient id="robinFeathers" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#6b736b" />
          <Stop offset="1" stopColor="#38463f" />
        </LinearGradient>
        <LinearGradient id="robinBreast" x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#e99a54" />
          <Stop offset="1" stopColor="#c9683e" />
        </LinearGradient>
      </Defs>
      <Rect width="760" height="440" fill="url(#forestSky)" />
      <Circle cx="598" cy="87" r="52" fill="#f3e7c7" opacity="0.72" />
      <Circle cx="91" cy="83" r="63" fill="#789174" opacity="0.23" />
      <Circle cx="674" cy="246" r="92" fill="#71856d" opacity="0.2" />
      <Path d="M0 257 C112 196 179 226 277 199 C387 168 486 209 580 178 C657 153 713 173 760 144 V440 H0Z" fill="#91a387" opacity="0.5" />
      <Path d="M0 310 C110 267 190 288 284 254 C389 216 474 262 575 225 C663 194 712 223 760 201 V440 H0Z" fill="#71846c" opacity="0.4" />
      <Path d="M0 361 C144 331 218 353 328 315 C451 274 563 332 760 271 V440 H0Z" fill="#627660" opacity="0.33" />
      <Path d="M-25 371 C151 329 274 361 420 324 C545 292 662 323 789 272" fill="none" stroke="#655d4b" strokeWidth="25" strokeLinecap="round" />
      <Path d="M-25 364 C151 322 274 354 420 317 C545 285 662 316 789 265" fill="none" stroke="#9a8665" strokeWidth="10" strokeLinecap="round" opacity="0.78" />
      <Path d="M66 340 C83 306 88 284 77 259 M77 300 C56 286 48 272 47 255 M694 293 C685 267 689 246 703 226" fill="none" stroke="#596b50" strokeWidth="5" strokeLinecap="round" />
      <Ellipse cx="80" cy="252" rx="23" ry="12" transform="rotate(-25 80 252)" fill="#788c66" />
      <Ellipse cx="50" cy="250" rx="18" ry="9" transform="rotate(31 50 250)" fill="#91a17a" />
      <Ellipse cx="704" cy="222" rx="23" ry="12" transform="rotate(-36 704 222)" fill="#748a69" />
      <Ellipse cx="681" cy="240" rx="18" ry="9" transform="rotate(23 681 240)" fill="#91a17a" />
      <Path d="M215 279 C257 255 292 204 335 173 C363 152 392 149 417 164 C438 178 449 205 444 231 C437 270 404 298 365 305 C331 312 301 294 273 284 C254 278 234 278 215 279Z" fill="url(#robinFeathers)" />
      <Path d="M269 276 C300 246 323 204 351 185 C374 169 400 174 414 195 C430 218 423 251 402 272 C379 296 340 297 312 285 C296 279 281 276 269 276Z" fill="#4d5a50" />
      <Path d="M278 278 C306 249 327 216 353 199 C364 191 380 188 391 193 C402 198 408 211 409 226 C411 249 393 272 370 282 C339 295 310 283 278 278Z" fill="url(#robinBreast)" />
      <Path d="M224 276 C259 260 290 229 322 197 C297 242 281 269 256 282Z" fill="#313f38" />
      <Path d="M317 202 C345 171 376 160 400 171 C386 178 366 189 346 212 C330 231 314 251 293 264 C302 239 307 218 317 202Z" fill="#7f877b" opacity="0.86" />
      <Path d="M355 287 C354 310 352 325 344 339 M389 283 C394 303 398 316 408 328" fill="none" stroke="#57483a" strokeWidth="5" strokeLinecap="round" />
      <Path d="M344 339 L330 345 M344 339 L357 345 M408 328 L396 335 M408 328 L422 331" fill="none" stroke="#57483a" strokeWidth="4" strokeLinecap="round" />
      <Circle cx="410" cy="163" r="27" fill="#59645b" />
      <Path d="M429 160 L477 169 L431 178Z" fill="#d58a45" />
      <Path d="M431 169 L469 171" stroke="#a75e38" strokeWidth="2" />
      <Circle cx="417" cy="157" r="4.3" fill="#17261f" />
      <Circle cx="418" cy="156" r="1.3" fill="#fff" />
      <Path d="M394 176 C404 183 417 185 430 180" fill="none" stroke="#f2e9d8" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      <Path d="M489 289 C507 263 518 249 542 240 M542 240 C557 224 569 217 586 214 M542 240 C559 243 572 251 582 265" fill="none" stroke="#60745b" strokeWidth="5" strokeLinecap="round" />
      <Ellipse cx="585" cy="213" rx="21" ry="10" transform="rotate(-29 585 213)" fill="#829471" />
      <Ellipse cx="582" cy="265" rx="20" ry="9" transform="rotate(29 582 265)" fill="#9aa47d" />
    </Svg>
  );
}

export default function BirdProfileScreen() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [isCollected, setIsCollected] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [note, setNote] = useState('Foraging beside Firwood Lake. Clear song from a low branch, early this morning.');
  const [draftNote, setDraftNote] = useState(note);
  const heroHeight = Math.min(350, Math.max(245, width * 0.59));

  const saveNote = () => {
    setNote(draftNote.trim());
    setIsEditingNote(false);
  };

  const cancelNoteEdit = () => {
    setDraftNote(note);
    setIsEditingNote(false);
  };

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
          onPress={() => setIsCollected((collected) => !collected)}
          accessibilityRole="button"
          accessibilityLabel={isCollected ? 'Remove from your collection' : 'Add to your collection'}
          accessibilityState={{ checked: isCollected }}
        >
          <Bookmark color={isCollected ? colors.leafDeep : colors.ink} fill={isCollected ? colors.leafDeep : 'transparent'} size={22} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <RobinIllustration />
          <View style={styles.heroLabel}>
            <Text style={styles.heroLabelText}>NO. 001 · THRUSHES</Text>
          </View>
          <View style={[styles.collectionBadge, !isCollected && styles.collectionBadgeInactive]}>
            {isCollected ? <Check color={colors.white} size={16} strokeWidth={3} /> : null}
            <Text style={styles.collectionText}>{isCollected ? 'In your collection' : 'Add to collection'}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <View style={styles.nameBlock}>
              <Text style={styles.birdName}>American Robin</Text>
              <Text style={styles.scientificName}>Turdus migratorius</Text>
            </View>
            <View style={styles.status}>
              <Text style={styles.statusCode}>LC</Text>
              <Text style={styles.statusLabel}>Least concern</Text>
            </View>
          </View>

          <View style={styles.measurements}>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Length</Text>
              <Text style={styles.measurementValue}>23–28 cm</Text>
            </View>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Wingspan</Text>
              <Text style={styles.measurementValue}>31–41 cm</Text>
            </View>
            <View style={styles.measurement}>
              <Text style={styles.measurementLabel}>Weight</Text>
              <Text style={styles.measurementValue}>77–85 g</Text>
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
                <Text style={styles.sectionTitle}>A familiar voice of morning</Text>
                <Text style={styles.bodyText}>
                  Look for a warm orange breast, gray back, and a bright white eye ring. Often seen hopping across lawns, pausing to listen for earthworms.
                </Text>
              </>
            ) : activeTab === 'habitat' ? (
              <>
                <View style={styles.sectionHeading}>
                  <Leaf color={colors.leafDeep} size={20} />
                  <Text style={styles.sectionTitle}>At home in open places</Text>
                </View>
                <Text style={styles.bodyText}>
                  Robins thrive in woodlands, parks, gardens, and neighborhood lawns. They nest in trees and shrubs, but often search for food on short, damp grass.
                </Text>
                <View style={styles.factLine}>
                  <Text style={styles.factLabel}>FAVORITE FORAGING GROUND</Text>
                  <Text style={styles.factValue}>Open lawns after rain</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.sectionHeading}>
                  <Sun color={colors.leafDeep} size={20} />
                  <Text style={styles.sectionTitle}>A year-round neighbor</Text>
                </View>
                <Text style={styles.bodyText}>
                  Many robins stay through winter where food is plentiful. In spring, their clear whistles return at dawn as pairs claim nesting territories.
                </Text>
                <View style={styles.seasonStrip}>
                  <Text style={styles.seasonText}>SPRING · NESTING</Text>
                  <Text style={styles.seasonText}>WINTER · FLOCKS</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.audioCard}>
            <View style={styles.audioMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text style={styles.audioMarkText}>♪</Text>
            </View>
            <View style={styles.audioDescription}>
              <Text style={styles.audioTitle}>Robin song</Text>
              <Text style={styles.audioSubtitle}>Cheerful, rising whistles</Text>
            </View>
            <View style={styles.audioStatus} accessibilityLabel="Audio unavailable">
              <Text style={styles.audioStatusText}>Audio unavailable</Text>
            </View>
          </View>

          <View style={styles.spottedRow}>
            <MapPin color={colors.leafDeep} size={20} strokeWidth={2.5} />
            <Text style={styles.spottedText}>First spotted · Oct 24 · Laurelhurst Park</Text>
          </View>

          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteEyebrow}>YOUR FIELD NOTE</Text>
              {!isEditingNote ? (
                <Pressable
                  style={styles.noteAction}
                  onPress={() => {
                    setDraftNote(note);
                    setIsEditingNote(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Edit field note"
                >
                  <Pencil color={colors.inkSoft} size={19} />
                </Pressable>
              ) : null}
            </View>
            {isEditingNote ? (
              <>
                <TextInput
                  style={styles.noteInput}
                  value={draftNote}
                  onChangeText={setDraftNote}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Field note"
                  placeholder="Add an observation..."
                  placeholderTextColor={colors.muted}
                />
                <View style={styles.noteEditActions}>
                  <Pressable style={styles.cancelButton} onPress={cancelNoteEdit} accessibilityRole="button">
                    <X color={colors.inkSoft} size={17} />
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={saveNote} accessibilityRole="button">
                    <Save color={colors.white} size={16} />
                    <Text style={styles.saveText}>Save note</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.noteText}>{note || 'No field note yet. Tap the pencil to add one.'}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
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
  collectionBadgeInactive: { backgroundColor: colors.inkSoft },
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
  seasonStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  seasonText: { overflow: 'hidden', color: colors.inkSoft, backgroundColor: '#E8EEE3', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
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
  spottedRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 16 },
  spottedText: { flexShrink: 1, color: colors.muted, fontSize: 14 },
  noteCard: { padding: 17, backgroundColor: '#E8EEE3', borderRadius: 18, gap: 10 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noteEyebrow: { color: '#477C61', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  noteAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -8, marginTop: -7 },
  noteText: { color: colors.inkSoft, fontSize: 15, lineHeight: 23, paddingRight: 22 },
  noteInput: {
    minHeight: 86,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    padding: 11,
    backgroundColor: colors.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  noteEditActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 2 },
  cancelButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  cancelText: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  saveButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#23644A' },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '700' },
});
