import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowUpRight, Bell, Check, ChevronDown, ChevronRight, Circle, Feather, Search, User, X } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { birdImages } from '../../src/data/bird-images';
import { birds, getDailyFeaturedBird } from '../../src/data/birds';
import { initialNotifications } from '../../src/data/notifications';
import { getPublishedAnnouncements, type AppAnnouncement } from '../../src/services/adminContent';
import { worldBirds } from '../../src/data/world-birds';
import { NotificationKindIcon } from '../../src/components/NotificationKindIcon';
import { PageHeader, PageHeaderAction } from '../../src/components/PageHeader';
import { useEbirdSpeciesSearch } from '../../src/hooks/useEbirdSpeciesSearch';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import { colors } from '../../src/theme';

type PickerKind = 'size' | 'family' | 'sort';
type SortOption = 'Name A–Z' | 'Name Z–A' | 'Rarity' | 'Size';
const habitatOptions = ['Woodland', 'Wetland', 'Backyard'] as const;
const sortOptions: SortOption[] = ['Name A–Z', 'Name Z–A', 'Rarity', 'Size'];

export default function IdentifyScreen() {
  const { savedIds, observations } = useSavedBirds();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState<PickerKind | null>(null);
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [featured, setFeatured] = useState(() => getDailyFeaturedBird());
  const [searchQuery, setSearchQuery] = useState('');
  const [habitatFilter, setHabitatFilter] = useState<string | null>('Woodland');
  const [sizeFilter, setSizeFilter] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('Name A–Z');
  const { matches: ebirdMatches, loading: ebirdLoading, error: ebirdError } = useEbirdSpeciesSearch(searchQuery);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const catalog = [...birds, ...worldBirds];
  const guideBirds = birds.map((bird, index) => ({ bird, catalogIndex: index + 1 }));
  const catalogByName = new Map<string, string>();
  const catalogSpecies = new Set<string>();

  catalog.forEach((bird) => {
    const scientificName = bird.scientificName.trim().toLowerCase();
    const commonName = bird.name.trim().toLowerCase();
    const speciesKey = scientificName || commonName;
    catalogSpecies.add(speciesKey);
    if (scientificName) catalogByName.set(scientificName, speciesKey);
    if (commonName) catalogByName.set(commonName, speciesKey);
  });

  const discoveredSpecies = new Set<string>();
  observations.forEach((observation) => {
    const scientificName = observation.scientificName?.trim().toLowerCase();
    const commonName = observation.commonName?.trim().toLowerCase();
    const speciesKey =
      (scientificName && catalogByName.get(scientificName)) ||
      (commonName && catalogByName.get(commonName));
    if (speciesKey) discoveredSpecies.add(speciesKey);
  });

  const discoveredCount = discoveredSpecies.size;
  const catalogCount = catalogSpecies.size;
  const progress = catalogCount ? Math.min(discoveredCount / catalogCount, 1) : 0;
  const progressPercentage = Math.round(progress * 100);
  const matchingBirds = guideBirds
    .filter(({ bird }) => {
      const query = searchQuery.trim().toLocaleLowerCase();
      const matchesSearch = !query || [
        bird.name,
        bird.scientificName,
        bird.family,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      const matchesHabitat = !habitatFilter || bird.habitat === habitatFilter;
      const matchesSize = !sizeFilter || bird.size === sizeFilter;
      const matchesFamily = !familyFilter || bird.family === familyFilter;
      const speciesKey = bird.scientificName.trim().toLowerCase() || bird.name.trim().toLowerCase();
      const matchesSeen = !unseenOnly || !discoveredSpecies.has(speciesKey);
      return matchesSearch && matchesHabitat && matchesSize && matchesFamily && matchesSeen;
    })
    .sort((a, b) => {
      if (sortOption === 'Name Z–A') return b.bird.name.localeCompare(a.bird.name);
      if (sortOption === 'Rarity') {
        const rarityOrder = ['common', 'uncommon', 'rare', 'exotic'];
        const rarityDifference = rarityOrder.indexOf(a.bird.rarity) - rarityOrder.indexOf(b.bird.rarity);
        return rarityDifference || a.bird.name.localeCompare(b.bird.name);
      }
      if (sortOption === 'Size') {
        const sizeOrder = ['Small', 'Medium', 'Large'];
        const sizeDifference = sizeOrder.indexOf(a.bird.size) - sizeOrder.indexOf(b.bird.size);
        return sizeDifference || a.bird.name.localeCompare(b.bird.name);
      }
      return a.bird.name.localeCompare(b.bird.name);
    });
  const familyOptions = [...new Set(guideBirds.map(({ bird }) => bird.family))]
    .sort((a, b) => a.localeCompare(b));
  const pickerOptions = pickerVisible === 'size'
    ? ['Any size', ...new Set(guideBirds.map(({ bird }) => bird.size))]
    : pickerVisible === 'family'
      ? ['All families', ...familyOptions]
      : sortOptions;
  const pickerTitle = pickerVisible === 'size'
    ? 'Choose a size'
    : pickerVisible === 'family'
      ? 'Choose a family'
      : 'Sort species';

  const selectPickerOption = (option: string) => {
    if (pickerVisible === 'size') setSizeFilter(option === 'Any size' ? null : option);
    if (pickerVisible === 'family') setFamilyFilter(option === 'All families' ? null : option);
    if (pickerVisible === 'sort') setSortOption(option as SortOption);
    setPickerVisible(null);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setHabitatFilter(null);
    setSizeFilter(null);
    setFamilyFilter(null);
    setUnseenOnly(false);
    setSortOption('Name A–Z');
  };

  useEffect(() => {
    const now = new Date();
    const nextLocalMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(() => setFeatured(getDailyFeaturedBird()), nextLocalMidnight.getTime() - now.getTime());
    return () => clearTimeout(timer);
  }, [featured]);

  useFocusEffect(useCallback(() => {
    let active = true;
    getPublishedAnnouncements()
      .then((items) => {
        if (active) setAnnouncements(items);
      })
      .catch(() => {
        if (active) setAnnouncements([]);
      });
    return () => { active = false; };
  }, []));

  const previewItems = [
    ...announcements.map((announcement) => ({
      id: announcement.id,
      kind: 'announcement' as const,
      title: announcement.title,
      detail: announcement.body,
      unread: true,
    })),
    ...initialNotifications,
  ].slice(0, 3);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="WingDex"
          subtitle="Explore. Identify. Discover."
          accessory={
            <View style={styles.headerActions}>
              <PageHeaderAction
                onPress={() => setNotificationsVisible(true)}
                accessibilityLabel="Notifications"
                accessibilityHint="Opens a preview of recent notifications"
                accessibilityState={{ expanded: notificationsVisible }}
              >
                <Bell color={colors.ink} size={22} strokeWidth={2} />
              </PageHeaderAction>
              <PageHeaderAction
                onPress={() => router.push('/user_profile')}
                accessibilityLabel="Account"
              >
                <User color={colors.ink} size={22} strokeWidth={2} />
              </PageHeaderAction>
            </View>
          }
        />

      <View style={styles.searchBar}>
        <Search color={colors.muted} size={18} strokeWidth={2} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search birds by name or family"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search birds by name, scientific name, or family"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={() => setSearchQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear bird search"
          >
            <X color={colors.muted} size={17} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/collection')}
        style={({ pressed }) => [styles.collectionProgress, pressed && styles.progressPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Your life list is growing. ${discoveredCount} of ${catalogCount} guide species discovered, ${progressPercentage} percent. Open collection.`}
      >
        <View style={styles.progressTopRow}>
          <View style={styles.progressIcon}>
            <Feather color={colors.leaf} size={19} />
          </View>
          <Text style={styles.progressTitle}>Your life list is growing</Text>
          <Text style={styles.progressCount}>
            {discoveredCount} / {catalogCount}
          </Text>
        </View>
        <View
          style={styles.progressTrack}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Guide species discovered"
          accessibilityValue={{ min: 0, max: 100, now: progressPercentage }}
        >
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressCaption}>
          {progressPercentage}% of guide species discovered
        </Text>
      </Pressable>

      <View style={styles.filterPanel}>
        <View style={styles.filterHeading}>
          <Text style={styles.filterTitle}>Refine your field guide</Text>
          <Pressable
            onPress={resetFilters}
            accessibilityRole="button"
            accessibilityLabel="Reset all search and filters"
          >
            <Text style={styles.filterReset}>Reset all</Text>
          </Pressable>
        </View>
        <View style={styles.filterRow}>
          {habitatOptions.map((habitat) => {
            const selected = habitatFilter === habitat;
            return (
              <Pressable
                key={habitat}
                onPress={() => setHabitatFilter(selected ? null : habitat)}
                style={[styles.filterPill, selected && styles.filterPillSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.filterPillText, selected && styles.filterPillTextSelected]}>
                  {habitat}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.filterRow, styles.filterOptionsRow]}>
          <Pressable
            onPress={() => setPickerVisible('size')}
            style={[styles.filterPill, styles.filterOptionPill]}
            accessibilityRole="button"
            accessibilityLabel={`Filter by size: ${sizeFilter ?? 'Any size'}`}
            accessibilityState={{ expanded: pickerVisible === 'size' }}
          >
            <Text style={styles.filterPillText}>{sizeFilter ?? 'Any size'}</Text>
            <ChevronDown color={colors.inkSoft} size={13} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => setPickerVisible('family')}
            style={[styles.filterPill, styles.filterOptionPill]}
            accessibilityRole="button"
            accessibilityLabel={`Filter by family: ${familyFilter ?? 'All families'}`}
            accessibilityState={{ expanded: pickerVisible === 'family' }}
          >
            <Text style={styles.filterPillText}>{familyFilter ?? 'All families'}</Text>
            <ChevronDown color={colors.inkSoft} size={13} strokeWidth={2} />
          </Pressable>
          <Pressable
            onPress={() => setUnseenOnly((current) => !current)}
            style={[
              styles.filterPill,
              styles.filterOptionPill,
              styles.unseenPill,
              unseenOnly && styles.filterPillSelected,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Show unseen birds only"
            accessibilityState={{ checked: unseenOnly }}
          >
            <Circle color={unseenOnly ? colors.white : colors.inkSoft} size={12} strokeWidth={1.7} />
            <Text style={[styles.filterPillText, unseenOnly && styles.filterPillTextSelected]}>Unseen</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.resultsSection}>
        <View style={styles.resultsHeading}>
          <View style={styles.resultsTitleGroup}>
            <Text style={styles.resultsTitle}>{habitatFilter ? `${habitatFilter} birds` : 'Field guide birds'}</Text>
            <View style={styles.resultsCount}>
              <Text style={styles.resultsCountText}>{matchingBirds.length} species</Text>
            </View>
          </View>
          <Pressable
            onPress={() => setPickerVisible('sort')}
            style={styles.sortCue}
            accessibilityRole="button"
            accessibilityLabel={`Sort species. Current order: ${sortOption}`}
            accessibilityState={{ expanded: pickerVisible === 'sort' }}
          >
            <Text style={styles.sortCueText}>{sortOption}</Text>
            <ChevronDown color={colors.inkSoft} size={15} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.resultList}>
          {searchQuery.trim().length >= 2 && (
            <View style={styles.ebirdResults}>
              <Text style={styles.ebirdResultsTitle}>eBird worldwide species</Text>
              {ebirdLoading && <Text style={styles.emptyResults}>Searching the eBird taxonomy…</Text>}
              {ebirdError && <Text style={styles.ebirdError}>{ebirdError}</Text>}
              {ebirdMatches.map((species) => (
                <Pressable
                  key={species.speciesCode}
                  onPress={() => router.push(`/bird/${species.speciesCode}`)}
                  style={({ pressed }) => [styles.birdResultCard, pressed && styles.progressPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${species.comName}, ${species.sciName}`}
                >
                  <View style={styles.birdResultCopy}>
                    <Text style={styles.birdResultName}>{species.comName}</Text>
                    <Text style={styles.birdResultScientific}>{species.sciName}</Text>
                    <Text style={styles.birdResultMeta}>
                      {species.familyComName ?? species.familySciName ?? species.category}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {!ebirdLoading && !ebirdError && ebirdMatches.length === 0 && (
                <Text style={styles.emptyResults}>No eBird species match that search.</Text>
              )}
            </View>
          )}
          {matchingBirds.map(({ bird, catalogIndex }) => {
            const isSaved = savedIds.includes(bird.id);
            return (
              <Pressable
                key={bird.id}
                onPress={() => router.push(`/bird/${bird.id}`)}
                style={({ pressed }) => [styles.birdResultCard, pressed && styles.progressPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${bird.name}, ${bird.scientificName}. Family ${bird.family}. ${bird.rarity} rarity. Catalog number ${String(catalogIndex).padStart(3, '0')}. ${isSaved ? 'In your collection' : 'Not yet in your collection'}.`}
                accessibilityHint="Opens this bird's profile"
              >
                <View style={styles.birdResultMain}>
                  {birdImages[bird.id] ? (
                    <Image source={birdImages[bird.id]} style={styles.birdResultImage} />
                  ) : (
                    <View style={styles.birdResultFallback}>
                      <Feather color={colors.inkSoft} size={25} />
                    </View>
                  )}
                  <View style={styles.birdResultCopy}>
                    <Text style={styles.birdResultName}>{bird.name}</Text>
                    <Text style={styles.birdResultScientific}>{bird.scientificName}</Text>
                    <Text style={styles.birdResultMeta}>
                      {bird.family} · {bird.rarity} · #{String(catalogIndex).padStart(3, '0')}
                    </Text>
                  </View>
                </View>
                <View style={styles.collectionStatus}>
                  <View style={[styles.collectionStatusIcon, !isSaved && styles.collectionStatusIconEmpty]}>
                    {isSaved ? (
                      <Check color={colors.white} size={11} strokeWidth={3} />
                    ) : (
                      <Circle color={colors.muted} size={9} strokeWidth={1.7} />
                    )}
                  </View>
                  <Text style={[styles.collectionStatusText, !isSaved && styles.collectionStatusTextEmpty]}>
                    {isSaved ? 'In your collection' : 'Not yet in your collection'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {matchingBirds.length === 0 && (
            <Text style={styles.emptyResults}>No birds match these filters. Try changing your search or reset the filters.</Text>
          )}
        </View>
      </View>

      <View style={styles.featureHeading}>
        <View>
          <Text style={styles.eyebrow}>SPECIES SPOTLIGHT</Text>
          <Text style={styles.sectionTitle}>From the island</Text>
        </View>
        <Pressable onPress={() => router.push('/birds')} accessibilityRole="button" accessibilityLabel="Browse birds">
          <ArrowUpRight color={colors.ink} size={20} />
        </Pressable>
      </View>

      <Pressable onPress={() => router.push(`/bird/${featured.id}`)} style={styles.featureCard}>
        <Image source={birdImages[featured.id]} style={styles.featureImage} />
        <View style={styles.featureShade} />
        <View style={styles.featureMeta}>
          <Text style={styles.featureEyebrow}>PALAWAN / {featured.rarity.toUpperCase()}</Text>
          <Text style={styles.featureName}>{featured.name}</Text>
          <Text style={styles.featureScientific}>{featured.scientificName}</Text>
        </View>
      </Pressable>
      <Text style={styles.photoCredit}>Photo: {featured.imageCredit} · {featured.imageLicense}</Text>
    </ScrollView>
    <Modal
      visible={notificationsVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setNotificationsVisible(false)}
    >
      <View style={styles.notificationModalRoot}>
        <Pressable
          style={styles.notificationBackdrop}
          onPress={() => setNotificationsVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close notification preview"
        />
        <View
          style={[
            styles.notificationPreview,
            {
              marginTop: insets.top + 58,
              marginBottom: insets.bottom + 16,
              maxHeight: Math.max(180, windowHeight - insets.top - insets.bottom - 90),
              width: Math.min(windowWidth - 32, 400),
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.previewHeader}>
            <View style={styles.previewHeading}>
              <Text style={styles.previewEyebrow}>RECENT UPDATES</Text>
              <Text style={styles.previewTitle}>Notifications</Text>
            </View>
            <Pressable
              onPress={() => setNotificationsVisible(false)}
              style={({ pressed }) => [styles.previewClose, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close notification preview"
              hitSlop={6}
            >
              <X color={colors.ink} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={styles.previewNote}>Fresh notes from Wingdex, alongside your field-journal activity.</Text>
          <ScrollView
            style={styles.previewList}
            contentContainerStyle={styles.previewListContent}
            showsVerticalScrollIndicator={false}
          >
            {previewItems.map((item) => (
              <View key={item.id} style={styles.previewItem}>
                <View style={styles.previewIcon}>
                  <NotificationKindIcon kind={item.kind} size={20} />
                </View>
                <View style={styles.previewCopy}>
                  <Text style={styles.previewItemTitle}>{item.title}</Text>
                  <Text style={styles.previewItemDetail}>{item.detail}</Text>
                </View>
                {item.unread && <View style={styles.previewUnreadDot} accessibilityLabel="Unread" />}
              </View>
            ))}
            {previewItems.length === 0 && (
              <Text style={styles.previewEmpty}>You’re all caught up. No notifications just yet.</Text>
            )}
          </ScrollView>
          <Pressable
            onPress={() => {
              setNotificationsVisible(false);
              router.push('/notifications');
            }}
            style={({ pressed }) => [styles.viewAllButton, pressed && styles.viewAllButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="View all notifications"
          >
            <Text style={styles.viewAllText}>View all notifications</Text>
            <ChevronRight color={colors.white} size={19} strokeWidth={2.3} />
          </Pressable>
        </View>
      </View>
    </Modal>
    <Modal
      visible={pickerVisible !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setPickerVisible(null)}
    >
      <View style={styles.pickerModalRoot}>
        <Pressable
          style={styles.notificationBackdrop}
          onPress={() => setPickerVisible(null)}
          accessibilityRole="button"
          accessibilityLabel="Close filter options"
        />
        <View style={styles.pickerDialog} accessibilityViewIsModal>
          <Text style={styles.pickerTitle}>{pickerTitle}</Text>
          <ScrollView style={styles.pickerOptions} showsVerticalScrollIndicator={false}>
            {pickerOptions.map((option) => {
              const selected = (pickerVisible === 'size' && (sizeFilter ?? 'Any size') === option)
                || (pickerVisible === 'family' && (familyFilter ?? 'All families') === option)
                || (pickerVisible === 'sort' && sortOption === option);
              return (
                <Pressable
                  key={option}
                  onPress={() => selectPickerOption(option)}
                  style={styles.pickerOption}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
                    {option}
                  </Text>
                  {selected && <Check color={colors.inkSoft} size={17} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F7F1' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  brand: { color: '#192F27', fontFamily: 'Georgia', fontSize: 26, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  locationMark: { width: 44, height: 44, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderRadius: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  locationText: { color: '#192F27', fontSize: 11, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationModalRoot: { flex: 1, alignItems: 'flex-end' },
  pickerModalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  notificationBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 35, 28, 0.42)' },
  pickerDialog: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  pickerTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 21, fontWeight: '700', marginBottom: 8 },
  pickerOptions: { flexGrow: 0 },
  pickerOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  pickerOptionText: { color: colors.inkSoft, fontSize: 14 },
  pickerOptionTextSelected: { color: colors.ink, fontWeight: '700' },
  notificationPreview: {
    marginRight: 16,
    flexShrink: 1,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  previewHeading: { flex: 1 },
  previewEyebrow: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  previewTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 2 },
  previewClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.white },
  previewNote: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  previewList: { flexShrink: 1, marginTop: 9 },
  previewListContent: { paddingBottom: 2 },
  previewItem: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F4EBD9' },
  previewCopy: { flex: 1, minWidth: 0 },
  previewItemTitle: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  previewItemDetail: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  previewUnreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.inkSoft },
  previewEmpty: { color: colors.muted, fontSize: 13, lineHeight: 19, paddingVertical: 20, textAlign: 'center' },
  viewAllButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.ink },
  viewAllButtonPressed: { backgroundColor: colors.inkSoft },
  viewAllText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  intro: { paddingTop: 28, paddingBottom: 20 },
  eyebrow: { color: '#245C43', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  collectionProgress: {
    backgroundColor: colors.leaf,
    padding: 14,
    marginTop: 22,
    borderRadius: 15,
  },
  progressPressed: { opacity: 0.82 },
  progressTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTitle: { color: colors.ink, fontSize: 13, fontWeight: '700', flex: 1 },
  progressCount: { color: colors.ink, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    backgroundColor: '#FFFFFFA8',
    borderRadius: 3,
    marginTop: 12,
  },
  progressFill: { height: '100%', backgroundColor: colors.inkSoft, borderRadius: 3 },
  progressCaption: { color: colors.inkSoft, fontSize: 10, marginTop: 7 },
  filterPanel: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 15,
    padding: 12,
    marginTop: 12,
  },
  filterHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  filterReset: { color: colors.inkSoft, fontSize: 10, fontWeight: '600' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  filterOptionsRow: { marginTop: 7, gap: 6 },
  filterPill: {
    minHeight: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  filterPillSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterPillText: { color: colors.inkSoft, fontSize: 10, fontWeight: '600' },
  filterPillTextSelected: { color: colors.white },
  filterOptionPill: { gap: 4, paddingHorizontal: 8 },
  unseenPill: { gap: 5 },
  searchBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    marginTop: 0,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: colors.ink, fontSize: 12 },
  emptyResults: {
    padding: 16,
    color: colors.muted,
    backgroundColor: colors.white,
    borderRadius: 14,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  resultsSection: { marginTop: 22 },
  resultsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  resultsTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  resultsTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 19, fontWeight: '700' },
  resultsCount: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8EEE5',
    borderRadius: 10,
  },
  resultsCountText: { color: colors.inkSoft, fontSize: 9, fontWeight: '700' },
  sortCue: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EEF1EB',
    borderRadius: 9,
  },
  sortCueText: { color: colors.inkSoft, fontSize: 10, fontWeight: '600' },
  resultList: { gap: 9 },
  ebirdResults: { gap: 8, marginBottom: 8 },
  ebirdResultsTitle: { color: colors.inkSoft, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  ebirdError: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  birdResultCard: {
    padding: 10,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 15,
  },
  birdResultMain: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  birdResultImage: { width: 70, height: 70, borderRadius: 11 },
  birdResultFallback: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leaf,
    borderRadius: 11,
  },
  birdResultCopy: { flex: 1, minWidth: 0 },
  birdResultName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  birdResultScientific: { color: colors.muted, fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  birdResultMeta: { color: colors.inkSoft, fontSize: 9, fontWeight: '600', marginTop: 5 },
  collectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEF0EA',
  },
  collectionStatusIcon: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkSoft,
    borderRadius: 8,
  },
  collectionStatusIconEmpty: { backgroundColor: '#EEF1EB' },
  collectionStatusText: { color: colors.inkSoft, fontSize: 10, fontWeight: '600' },
  collectionStatusTextEmpty: { color: colors.muted, fontWeight: '500' },
  uploadPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E6DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  deviceTop: { height: 24, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  lens: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E6EEE2', borderWidth: 1, borderColor: '#BFCDBE' },
  indicatorGroup: { flexDirection: 'row', gap: 4 },
  indicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#245C43' },
  indicatorDim: { backgroundColor: '#BFCDBE' },
  deviceCode: { color: '#748078', fontSize: 8, fontWeight: '600', letterSpacing: 1, marginLeft: 'auto' },
  uploadHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  uploadIcon: { width: 32, height: 32, backgroundColor: '#E6EEE2', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  sectionTitle: { color: '#192F27', fontSize: 17, fontWeight: '700' },
  uploadSectionTitle: { color: '#192F27', fontSize: 17, fontWeight: '700' },
  sectionSub: { color: '#748078', fontSize: 12, marginTop: 3 },
  pickArea: {
    height: 160,
    borderWidth: 1,
    borderColor: '#BFCDBE',
    borderStyle: 'dashed',
    backgroundColor: '#F6F7F1',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pickGraphic: { width: 48, height: 48, backgroundColor: '#E6EEE2', alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 9 },
  pickTitle: { color: '#192F27', fontSize: 14, fontWeight: '700' },
  pickHint: { color: '#748078', fontSize: 11, marginTop: 4 },
  previewWrap: { height: 220, overflow: 'hidden', backgroundColor: '#E6EEE2', borderRadius: 16 },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  retakeButton: { position: 'absolute', right: 12, top: 12, width: 36, height: 36, backgroundColor: 'rgba(25, 47, 39, 0.8)', alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  primaryButton: { minHeight: 52, backgroundColor: '#192F27', marginTop: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16 },
  primaryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.6 },
  privacyNote: { color: '#748078', fontSize: 10, marginTop: 12, textAlign: 'center' },
  messageBox: { marginTop: 16, padding: 12, backgroundColor: '#E6EEE2', borderRadius: 12 },
  messageText: { color: '#A33F30', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  messageDetail: { color: '#192F27', fontSize: 11, marginTop: 4 },
  resultCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E1E6DC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  resultImage: { width: 64, height: 64, borderRadius: 12 },
  unknownResult: { width: 64, height: 64, backgroundColor: '#BFCDBE', alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  unknownMark: { color: '#192F27', fontFamily: 'Georgia', fontSize: 31 },
  resultCopy: { flex: 1, minWidth: 0 },
  resultKicker: { color: '#245C43', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  resultName: { color: '#192F27', fontSize: 16, fontWeight: '700', marginTop: 3 },
  resultRarity: { color: '#748078', fontSize: 10, marginTop: 3 },
  resultScientific: { color: '#748078', fontSize: 11, fontStyle: 'italic', marginTop: 3 },
  resultFooter: { width: '100%', borderTopWidth: 1, borderTopColor: '#E1E6DC', paddingTop: 12, marginTop: 4 },
  resultDescription: { color: '#192F27', fontSize: 12, lineHeight: 16 },
  resultLink: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  resultLinkText: { color: '#245C43', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  featureHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 16 },
  featureCard: { height: 240, overflow: 'hidden', backgroundColor: '#192F27', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5 },
  featureImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featureShade: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(25, 47, 39, 0.4)' },
  featureMeta: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  featureEyebrow: { color: '#E8C763', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  featureName: { color: '#FFFFFF', fontFamily: 'Georgia', fontSize: 24, lineHeight: 28, marginTop: 5 },
  featureScientific: { color: '#FFFFFFD9', fontSize: 13, fontStyle: 'italic', marginTop: 3 },
  photoCredit: { color: '#748078', fontSize: 9, lineHeight: 13, marginTop: 10, textAlign: 'center' },
});
