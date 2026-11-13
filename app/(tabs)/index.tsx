import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Feather,
  MapPin,
  Search,
  User,
  X,
} from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { birdImages } from '../../src/data/bird-images';
import { birds, getDailyFeaturedBird, type Bird } from '../../src/data/birds';
import { initialNotifications } from '../../src/data/notifications';
import {
  findPhilippineRegion,
  philippineRegions,
} from '../../src/data/philippineRegions';
import { NotificationKindIcon } from '../../src/components/NotificationKindIcon';
import { PageHeader, PageHeaderAction } from '../../src/components/PageHeader';
import { useEbirdSpeciesSearch } from '../../src/hooks/useEbirdSpeciesSearch';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import {
  getPhilippineRegionalChecklist,
  type EbirdRegionalChecklist,
  type EbirdSpecies,
} from '../../src/services/ebird';
import { getPublishedAnnouncements, type AppAnnouncement } from '../../src/services/adminContent';
import { worldBirds } from '../../src/data/world-birds';
import { colors } from '../../src/theme';

const exploreRegionStorageKey = 'wingdex.explore-region.v1';
const checklistPageSize = 24;

export default function ExploreScreen() {
  const { savedIds, observations, storageError, toggle } = useSavedBirds();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [featured, setFeatured] = useState(() => getDailyFeaturedBird());
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null);
  const [regionSelectionLoaded, setRegionSelectionLoaded] = useState(false);
  const [regionPreferenceError, setRegionPreferenceError] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<EbirdRegionalChecklist | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [checklistRetry, setChecklistRetry] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleSpeciesLimit, setVisibleSpeciesLimit] = useState(checklistPageSize);
  const { matches: ebirdMatches, loading: ebirdLoading, error: ebirdError } = useEbirdSpeciesSearch(searchQuery);
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const selectedRegion = findPhilippineRegion(selectedRegionCode);
  const catalog = [...birds, ...worldBirds];
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
      (scientificName && catalogByName.get(scientificName))
      || (commonName && catalogByName.get(commonName));
    if (speciesKey) discoveredSpecies.add(speciesKey);
  });

  const discoveredCount = discoveredSpecies.size;
  const catalogCount = catalogSpecies.size;
  const progress = catalogCount ? Math.min(discoveredCount / catalogCount, 1) : 0;
  const progressPercentage = Math.round(progress * 100);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(exploreRegionStorageKey)
      .then((storedCode) => {
        if (!active) return;
        setSelectedRegionCode(findPhilippineRegion(storedCode)?.code ?? 'NCR');
        setRegionSelectionLoaded(true);
        setChecklistLoading(true);
      })
      .catch(() => {
        if (!active) return;
        setSelectedRegionCode('NCR');
        setRegionPreferenceError('Your saved Explore region could not be restored; National Capital Region is selected for now.');
        setRegionSelectionLoaded(true);
        setChecklistLoading(true);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedRegionCode || !regionSelectionLoaded) return;
    let active = true;
    getPhilippineRegionalChecklist(selectedRegionCode)
      .then((result) => {
        if (result.regionCode !== selectedRegionCode
          || !Array.isArray(result.speciesCodes)
          || !Array.isArray(result.species)
          || result.species.length !== result.speciesCodes.length) {
          throw new Error('The regional species list is incomplete or does not match the selected region. Please try again later.');
        }
        if (active) setChecklist(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setChecklist(null);
          setChecklistError(error instanceof Error ? error.message : 'Could not load this region’s species checklist.');
        }
      })
      .finally(() => {
        if (active) setChecklistLoading(false);
      });
    return () => { active = false; };
  }, [selectedRegionCode, regionSelectionLoaded, checklistRetry]);

  useEffect(() => {
    const now = new Date();
    const nextLocalMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(
      () => setFeatured(getDailyFeaturedBird()),
      nextLocalMidnight.getTime() - now.getTime(),
    );
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

  const chooseRegion = (regionCode: string) => {
    const region = findPhilippineRegion(regionCode);
    if (!region) return;
    if (region.code === selectedRegionCode) {
      setRegionPickerVisible(false);
      return;
    }
    setSelectedRegionCode(region.code);
    setChecklist(null);
    setChecklistError(null);
    setRegionPreferenceError(null);
    setChecklistLoading(true);
    setVisibleSpeciesLimit(checklistPageSize);
    setRegionPickerVisible(false);
    void AsyncStorage.setItem(exploreRegionStorageKey, region.code).catch((error: unknown) => {
      setRegionPreferenceError(error instanceof Error
        ? `Your region is selected, but it could not be saved: ${error.message}`
        : 'Your region is selected, but it could not be saved.');
    });
  };

  const updateSearchQuery = (query: string) => {
    setSearchQuery(query);
    setVisibleSpeciesLimit(checklistPageSize);
  };

  const retryChecklist = () => {
    setChecklist(null);
    setChecklistError(null);
    setChecklistLoading(true);
    setVisibleSpeciesLimit(checklistPageSize);
    setChecklistRetry((attempt) => attempt + 1);
  };

  const activeChecklist = checklist?.regionCode === selectedRegionCode ? checklist : null;
  const matchingRegionSpecies = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return (activeChecklist?.species ?? [])
      .filter((species) => !query || [
        species.comName,
        species.sciName,
        species.familyComName ?? '',
        species.familySciName ?? '',
      ].some((value) => value.toLocaleLowerCase().includes(query)))
      .sort((a, b) => a.comName.localeCompare(b.comName));
  }, [activeChecklist, searchQuery]);

  const regionalSpeciesCodes = useMemo(
    () => new Set((activeChecklist?.speciesCodes ?? []).map((code) => code.toLowerCase())),
    [activeChecklist],
  );
  const visibleRegionSpecies = matchingRegionSpecies.slice(0, visibleSpeciesLimit);
  const outsideRegionMatches = searchQuery.trim().length >= 2
    ? ebirdMatches.filter((species) => !regionalSpeciesCodes.has(species.speciesCode.toLowerCase()))
    : [];
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

  const findGuideBird = (species: EbirdSpecies): Bird | undefined =>
    birds.find((bird) =>
      bird.scientificName.toLocaleLowerCase() === species.sciName.toLocaleLowerCase()
      || bird.name.toLocaleLowerCase() === species.comName.toLocaleLowerCase(),
    );

  const renderSpecies = (species: EbirdSpecies, regional = true, entryNumber?: number) => {
    const guideBird = findGuideBird(species);
    const isSaved = Boolean(guideBird && savedIds.includes(guideBird.id));
    const isDiscovered = observations.some((observation) =>
      observation.ebirdSpecies?.speciesCode.toLowerCase() === species.speciesCode.toLowerCase()
      || observation.scientificName?.toLocaleLowerCase() === species.sciName.toLocaleLowerCase()
      || observation.commonName?.toLocaleLowerCase() === species.comName.toLocaleLowerCase(),
    );
    return (
      <View key={species.speciesCode} style={styles.speciesRow}>
        <Pressable
          onPress={() => router.push(`/bird/${species.speciesCode}`)}
          style={({ pressed }) => [styles.speciesMain, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`View ${species.comName}, ${species.sciName}`}
          accessibilityHint="Opens this bird’s field guide profile"
        >
          <View style={styles.speciesImageColumn}>
            {regional && entryNumber !== undefined && (
              <Text style={styles.speciesIndex}>FIELD NOTE {String(entryNumber).padStart(2, '0')}</Text>
            )}
            {guideBird && birdImages[guideBird.id] ? (
              <Image source={birdImages[guideBird.id]} style={styles.speciesImage} />
            ) : (
              <View style={styles.speciesImageFallback}>
                <Feather color={colors.inkSoft} size={24} strokeWidth={1.7} />
              </View>
            )}
          </View>
          <View style={styles.speciesCopy}>
            <Text numberOfLines={2} style={styles.speciesName}>{species.comName}</Text>
            <Text numberOfLines={2} style={styles.speciesScientific}>{species.sciName}</Text>
            <Text numberOfLines={2} style={styles.speciesMeta}>
              {species.familyComName ?? species.familySciName ?? species.category}
            </Text>
          </View>
          <ChevronRight color={colors.muted} size={18} />
        </Pressable>
        <View style={styles.speciesFooter}>
          <Text style={styles.speciesStatus}>
            {isDiscovered ? 'On your life list' : regional ? 'In regional checklist' : 'Worldwide taxonomy'}
          </Text>
          {guideBird && (
            <Pressable
              onPress={() => void toggle(guideBird.id)}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isSaved
                ? `Remove ${species.comName} from your collection`
                : `Save ${species.comName} to your collection`}
              accessibilityState={{ selected: isSaved }}
              hitSlop={6}
            >
              {isSaved
                ? <BookmarkCheck color={colors.ink} size={18} />
                : <Bookmark color={colors.inkSoft} size={18} />}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

        <View style={styles.regionSection}>
          <View style={styles.sectionKickerRow}>
            <Text style={styles.eyebrow}>PHILIPPINE FIELD GUIDE</Text>
            <Text style={styles.regionCount}>{philippineRegions.length} REGIONS</Text>
          </View>
          <Pressable
            onPress={() => setRegionPickerVisible(true)}
            disabled={!regionSelectionLoaded}
            style={({ pressed }) => [
              styles.regionCard,
              pressed && styles.regionCardPressed,
              !regionSelectionLoaded && styles.regionCardDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={selectedRegion
              ? `Selected Explore region: ${selectedRegion.name}. Change region.`
              : 'Choose a Philippine region'}
            accessibilityState={{ expanded: regionPickerVisible, disabled: !regionSelectionLoaded }}
          >
            <View style={styles.regionIcon}>
              <MapPin color={colors.leaf} size={20} strokeWidth={2} />
            </View>
            <View style={styles.regionCopy}>
              <Text style={styles.regionLabel}>BIRDS OF</Text>
              <Text style={styles.regionName}>
                {selectedRegion?.name ?? (regionSelectionLoaded ? 'Choose a region' : 'Loading regions…')}
              </Text>
              <Text style={styles.regionDetail}>
                {selectedRegion ? `${selectedRegion.code}  ·  Explore selection only` : 'Browse official Philippine administrative regions'}
              </Text>
            </View>
            <ChevronDown color={colors.white} size={20} />
          </Pressable>
          {regionPreferenceError && (
            <Text accessibilityRole="alert" style={styles.preferenceError}>{regionPreferenceError}</Text>
          )}
        </View>

        <View style={styles.searchBar}>
          <Search color={colors.muted} size={18} strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={updateSearchQuery}
            placeholder="Search this region by bird or family"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Search species in the selected region"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => updateSearchQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear bird search"
            >
              <X color={colors.muted} size={17} />
            </Pressable>
          )}
        </View>

        <View style={styles.resultsSection}>
          <View style={styles.resultsHeading}>
            <View style={styles.resultsTitleGroup}>
              <View>
                <Text style={styles.resultsKicker}>
                  {selectedRegion?.code ?? 'PHILIPPINES'}  /  FIELD RECORD
                </Text>
                <Text style={styles.resultsTitle}>Species to look for</Text>
              </View>
              {activeChecklist && (
                <View style={styles.resultsCount}>
                  <Text style={styles.resultsCountText}>{matchingRegionSpecies.length}</Text>
                </View>
              )}
            </View>
            <View style={styles.sourceStamp}>
              <Text style={styles.checklistSource}>eBIRD</Text>
              <Text style={styles.checklistSourceSub}>REGION LIST</Text>
            </View>
          </View>
          <Text style={styles.resultsNote}>
            Field notes from {selectedRegion?.name ?? 'your selected region'} · published regional species.
          </Text>

          {!regionSelectionLoaded || checklistLoading ? (
            <View style={styles.stateCard} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.inkSoft} size="small" />
              <Text style={styles.stateText}>
                {regionSelectionLoaded ? 'Loading the regional eBird checklist…' : 'Preparing your Explore region…'}
              </Text>
            </View>
          ) : checklistError ? (
            <View style={styles.errorCard} accessibilityLiveRegion="polite">
              <Text style={styles.errorTitle}>This checklist is unavailable</Text>
              <Text style={styles.errorText}>{checklistError}</Text>
              <Pressable
                onPress={retryChecklist}
                style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : activeChecklist && matchingRegionSpecies.length > 0 ? (
            <View style={styles.speciesList}>
              {visibleRegionSpecies.map((species, index) => renderSpecies(species, true, index + 1))}
              {visibleRegionSpecies.length < matchingRegionSpecies.length && (
                <Pressable
                  onPress={() => setVisibleSpeciesLimit((limit) =>
                    Math.min(limit + checklistPageSize, matchingRegionSpecies.length))}
                  style={({ pressed }) => [styles.loadMoreButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Show more regional species. ${visibleRegionSpecies.length} of ${matchingRegionSpecies.length} shown.`}
                >
                  <Text style={styles.loadMoreText}>Load next field notes</Text>
                  <Text style={styles.loadMoreCount}>
                    {visibleRegionSpecies.length} / {matchingRegionSpecies.length}
                  </Text>
                </Pressable>
              )}
            </View>
          ) : activeChecklist ? (
            <View style={styles.emptyCard}>
              <Feather color={colors.inkSoft} size={22} />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? 'No regional birds match' : 'No species in this checklist'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? 'Try another bird or family name, or clear your search.'
                  : 'There are no published species for this region yet.'}
              </Text>
            </View>
          ) : null}
        </View>

        {searchQuery.trim().length >= 2 && (
          <View style={styles.worldSearchSection}>
            <Text style={styles.worldSearchTitle}>Worldwide eBird search</Text>
            <Text style={styles.worldSearchNote}>
              These taxonomy matches are not confirmed as occurring in {selectedRegion?.name ?? 'this region'}.
            </Text>
            {ebirdLoading && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator color={colors.inkSoft} size="small" />
                <Text style={styles.stateText}>Searching the eBird taxonomy…</Text>
              </View>
            )}
            {ebirdError && <Text style={styles.globalError}>{ebirdError}</Text>}
            {!ebirdLoading && !ebirdError && outsideRegionMatches.map((species) => renderSpecies(species, false))}
            {!ebirdLoading && !ebirdError && ebirdMatches.length > 0 && outsideRegionMatches.length === 0 && (
              <Text style={styles.noWorldResults}>All matching species shown are already in this regional checklist.</Text>
            )}
            {!ebirdLoading && !ebirdError && ebirdMatches.length === 0 && (
              <Text style={styles.noWorldResults}>No worldwide eBird species match that search.</Text>
            )}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/collection')}
          style={({ pressed }) => [styles.collectionProgress, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Your life list is growing. ${discoveredCount} of ${catalogCount} guide species discovered, ${progressPercentage} percent. Open collection.`}
        >
          <View style={styles.progressTopRow}>
            <View style={styles.progressIcon}><Feather color={colors.leaf} size={18} /></View>
            <View style={styles.progressCopy}>
              <Text style={styles.progressTitle}>Your life list is growing</Text>
              <Text style={styles.progressCaption}>{progressPercentage}% of guide species discovered</Text>
            </View>
            <Text style={styles.progressCount}>{discoveredCount}<Text style={styles.progressTotal}> / {catalogCount}</Text></Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </Pressable>

        {storageError && <Text style={styles.storageError}>Your collection could not be updated. Please try again.</Text>}

        <View style={styles.featureHeading}>
          <View>
            <Text style={styles.eyebrow}>SPECIES SPOTLIGHT</Text>
            <Text style={styles.featureHeadingTitle}>Today in the field guide</Text>
          </View>
          <Pressable
            onPress={() => router.push(`/bird/${featured.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${featured.name}`}
            hitSlop={8}
          >
            <ArrowUpRight color={colors.ink} size={20} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push(`/bird/${featured.id}`)}
          style={styles.featureCard}
          accessibilityRole="button"
          accessibilityLabel={`Species spotlight: ${featured.name}, ${featured.scientificName}`}
        >
          <Image source={birdImages[featured.id]} style={styles.featureImage} />
          <View style={styles.featureShade} />
          <View style={styles.featureMeta}>
            <Text style={styles.featureEyebrow}>DAILY FIELD NOTE  /  {featured.rarity.toUpperCase()}</Text>
            <Text style={styles.featureName}>{featured.name}</Text>
            <Text style={styles.featureScientific}>{featured.scientificName}</Text>
          </View>
        </Pressable>
        <Text style={styles.photoCredit}>Photo: {featured.imageCredit} · {featured.imageLicense}</Text>
      </ScrollView>

      <Modal
        visible={regionPickerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRegionPickerVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setRegionPickerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close region picker"
          />
          <View
            style={[
              styles.regionDialog,
              {
                marginTop: insets.top + 16,
                marginBottom: insets.bottom + 16,
                maxHeight: Math.max(240, windowHeight - insets.top - insets.bottom - 32),
                width: Math.min(windowWidth - 32, 440),
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeading}>
                <Text style={styles.eyebrow}>EXPLORE BY PLACE</Text>
                <Text style={styles.dialogTitle}>Choose a region</Text>
              </View>
              <Pressable
                onPress={() => setRegionPickerVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close region picker"
                hitSlop={6}
              >
                <X color={colors.ink} size={19} />
              </Pressable>
            </View>
            <Text style={styles.dialogNote}>This only changes Explore. Your saved home region stays as it is.</Text>
            <ScrollView style={styles.regionOptions} showsVerticalScrollIndicator={false}>
              {philippineRegions.map((region, index) => {
                const selected = region.code === selectedRegionCode;
                return (
                  <Pressable
                    key={region.code}
                    onPress={() => chooseRegion(region.code)}
                    style={({ pressed }) => [
                      styles.regionOption,
                      selected && styles.regionOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.regionOptionIndex, selected && styles.regionOptionIndexSelected]}>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                    <View style={styles.regionOptionCopy}>
                      <Text style={[styles.regionOptionName, selected && styles.regionOptionNameSelected]}>
                        {region.name}
                      </Text>
                      <Text style={styles.regionOptionCode}>{region.code}</Text>
                    </View>
                    {selected && <Check color={colors.inkSoft} size={18} strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationsVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setNotificationsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close notification preview"
          />
          <View
            style={[
              styles.notificationDialog,
              {
                marginTop: insets.top + 16,
                marginBottom: insets.bottom + 16,
                maxHeight: Math.max(200, windowHeight - insets.top - insets.bottom - 32),
                width: Math.min(windowWidth - 32, 400),
              },
            ]}
            accessibilityViewIsModal
          >
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeading}>
                <Text style={styles.eyebrow}>RECENT UPDATES</Text>
                <Text style={styles.dialogTitle}>Notifications</Text>
              </View>
              <Pressable
                onPress={() => setNotificationsVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close notification preview"
                hitSlop={6}
              >
                <X color={colors.ink} size={19} />
              </Pressable>
            </View>
            <Text style={styles.dialogNote}>Fresh notes from Wingdex, alongside your field-journal activity.</Text>
            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
              {previewItems.map((item) => (
                <View key={item.id} style={styles.notificationItem}>
                  <View style={styles.notificationIcon}>
                    <NotificationKindIcon kind={item.kind} size={20} />
                  </View>
                  <View style={styles.notificationCopy}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationDetail}>{item.detail}</Text>
                  </View>
                  {item.unread && <View style={styles.unreadDot} accessibilityLabel="Unread" />}
                </View>
              ))}
              {previewItems.length === 0 && (
                <Text style={styles.notificationEmpty}>You’re all caught up. No notifications just yet.</Text>
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                setNotificationsVisible(false);
                router.push('/notifications');
              }}
              style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="View all notifications"
            >
              <Text style={styles.viewAllText}>View all notifications</Text>
              <ChevronRight color={colors.white} size={19} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionSection: { marginTop: 20 },
  sectionKickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  eyebrow: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  regionCount: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  regionCard: {
    minHeight: 116,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 17,
    backgroundColor: colors.ink,
    borderRadius: 18,
  },
  regionCardPressed: { backgroundColor: colors.inkSoft },
  regionCardDisabled: { opacity: 0.8 },
  regionIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#FFFFFF1C' },
  regionCopy: { flex: 1, minWidth: 0 },
  regionLabel: { color: colors.leaf, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  regionName: { color: colors.white, fontFamily: 'Georgia', fontSize: 21, lineHeight: 26, fontWeight: '700', marginTop: 3 },
  regionDetail: { color: '#D5DED6', fontSize: 12, lineHeight: 17, marginTop: 4 },
  preferenceError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 7 },
  collectionProgress: { padding: 14, marginTop: 12, borderRadius: 15, backgroundColor: colors.leaf },
  progressTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  progressCopy: { flex: 1 },
  progressTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  progressCaption: { color: colors.inkSoft, fontSize: 12, marginTop: 3 },
  progressCount: { color: colors.ink, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTotal: { color: colors.inkSoft, fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 5, overflow: 'hidden', backgroundColor: '#FFFFFFA8', borderRadius: 3, marginTop: 11 },
  progressFill: { height: '100%', backgroundColor: colors.inkSoft, borderRadius: 3 },
  searchBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    marginTop: 14,
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 0, color: colors.ink, fontSize: 12 },
  resultsSection: { marginTop: 22 },
  resultsHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  resultsTitleGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultsKicker: { color: '#9A7542', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 },
  resultsTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 22, lineHeight: 27, fontWeight: '700' },
  resultsCount: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#E8EEE5', borderRadius: 10 },
  resultsCountText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  sourceStamp: { alignItems: 'flex-end', paddingVertical: 5, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: colors.yellow },
  checklistSource: { color: colors.inkSoft, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  checklistSourceSub: { color: colors.muted, fontSize: 8, fontWeight: '700', letterSpacing: 0.7, marginTop: 2 },
  resultsNote: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, marginTop: 5, marginBottom: 11 },
  stateCard: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stateText: { color: colors.muted, fontSize: 12, lineHeight: 17, flexShrink: 1 },
  errorCard: { padding: 16, backgroundColor: colors.coralPale, borderRadius: 15, borderWidth: 1, borderColor: '#EAC6B8' },
  errorTitle: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  errorText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, marginTop: 5 },
  retryButton: { minHeight: 42, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 13, marginTop: 11, backgroundColor: colors.ink, borderRadius: 11 },
  retryText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  speciesList: { overflow: 'hidden', backgroundColor: colors.white, borderColor: colors.line, borderWidth: 1, borderRadius: 15 },
  speciesRow: { paddingHorizontal: 11, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line },
  speciesMain: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  speciesImageColumn: { width: 62, alignItems: 'flex-start', gap: 4 },
  speciesIndex: { color: '#9A7542', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  speciesImage: { width: 62, height: 62, borderRadius: 11, backgroundColor: colors.leaf },
  speciesImageFallback: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#E6EEE2' },
  speciesCopy: { flex: 1, minWidth: 0 },
  speciesName: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  speciesScientific: { color: colors.muted, fontSize: 12, lineHeight: 17, fontStyle: 'italic', marginTop: 2 },
  speciesMeta: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 4 },
  speciesFooter: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 72, marginTop: 6, borderTopWidth: 1, borderTopColor: '#EEF0EA' },
  speciesStatus: { flexShrink: 1, color: colors.muted, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  loadMoreButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: '#F3F4EE', borderTopWidth: 1, borderTopColor: colors.line },
  loadMoreText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  loadMoreCount: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  saveButton: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { minHeight: 140, alignItems: 'center', justifyContent: 'center', padding: 19, backgroundColor: '#F1F3ED', borderRadius: 15, borderWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptyText: { color: colors.muted, maxWidth: 260, textAlign: 'center', fontSize: 12, lineHeight: 17, marginTop: 5 },
  worldSearchSection: { marginTop: 24 },
  worldSearchTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 17, fontWeight: '700' },
  worldSearchNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 10 },
  inlineLoading: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 9 },
  globalError: { padding: 12, color: colors.danger, backgroundColor: colors.coralPale, borderRadius: 12, fontSize: 12, lineHeight: 17 },
  noWorldResults: { color: colors.muted, fontSize: 12, lineHeight: 17, paddingVertical: 9 },
  storageError: { color: colors.danger, fontSize: 12, lineHeight: 17, marginTop: 10 },
  featureHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 13 },
  featureHeadingTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', marginTop: 3 },
  featureCard: { height: 222, overflow: 'hidden', backgroundColor: colors.ink, borderRadius: 20 },
  featureImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  featureShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(25, 47, 39, 0.38)' },
  featureMeta: { position: 'absolute', left: 18, right: 18, bottom: 17 },
  featureEyebrow: { color: colors.yellow, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  featureName: { color: colors.white, fontFamily: 'Georgia', fontSize: 23, lineHeight: 28, marginTop: 5 },
  featureScientific: { color: '#FFFFFFD9', fontSize: 12, fontStyle: 'italic', marginTop: 3 },
  photoCredit: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 5 },
  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16, 35, 28, 0.48)' },
  regionDialog: { flexShrink: 1, padding: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  notificationDialog: { flexShrink: 1, padding: 17, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dialogHeading: { flex: 1 },
  dialogTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 3 },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.white },
  dialogNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 5, marginBottom: 9 },
  regionOptions: { flexGrow: 0 },
  regionOption: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  regionOptionSelected: { backgroundColor: '#E8EEE5' },
  regionOptionIndex: { color: colors.muted, width: 22, fontSize: 9, fontWeight: '800', fontVariant: ['tabular-nums'] },
  regionOptionIndexSelected: { color: colors.inkSoft },
  regionOptionCopy: { flex: 1 },
  regionOptionName: { color: colors.inkSoft, fontSize: 12, fontWeight: '600' },
  regionOptionNameSelected: { color: colors.ink, fontWeight: '800' },
  regionOptionCode: { color: colors.muted, fontSize: 11, marginTop: 2 },
  notificationList: { flexShrink: 1, marginTop: 4 },
  notificationItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  notificationIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#F4EBD9' },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationTitle: { color: colors.ink, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  notificationDetail: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.inkSoft },
  notificationEmpty: { color: colors.muted, fontSize: 12, lineHeight: 18, paddingVertical: 20, textAlign: 'center' },
  viewAllButton: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.ink },
  viewAllText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.82 },
});
