import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bird, Check, ChevronDown, LockKeyhole, MapPin, Shield } from 'lucide-react-native';
import Svg, { Circle, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { PageHeader } from '../../src/components/PageHeader';
import { philippineRegions, findPhilippineRegion } from '../../src/data/philippineRegions';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import { calculateRegionalProgress, collectQualifyingSpeciesForRegion, universalRegionalRankDefinitions } from '../../src/services/regionalRanks';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme';

const storageKey = 'wingdex.home-region.v2';

type RegionChecklist = {
  version: string;
  regionCode: string;
  regionName: string;
  eligibleSpeciesCount: number;
  snapshotDate: string;
  source: 'ebird-product-spplist';
  valueHash: string;
  asOf: string;
  speciesCodes: string[];
  sourceRegionCodes: string[];
};

type RegionalAchievement = {
  rank_code: string;
  checklist_version: string;
  unlocked_at: string;
  region_code: string;
};

function getRegionAccent(regionCode: string) {
  const palette = ['#B35A44', '#E8C763', '#A8C8A4', '#38564D', '#9F8D72', '#C9D5C7'];
  const index = Array.from(regionCode).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return palette[index];
}

function getRegionBadgeLabel(regionCode: string) {
  const labels: Record<string, string> = {
    REGION_I: 'I',
    REGION_II: 'II',
    REGION_III: 'III',
    REGION_IV_A: 'IV-A',
    REGION_IV_B: 'IV-B',
    REGION_V: 'V',
    REGION_VI: 'VI',
    REGION_VII: 'VII',
    REGION_VIII: 'VIII',
    REGION_IX: 'IX',
    REGION_X: 'X',
    REGION_XI: 'XI',
    REGION_XII: 'XII',
    REGION_XIII: 'XIII',
  };
  return labels[regionCode] ?? regionCode;
}

function RegionalBadgeMark({
  variant,
  accent,
  regionCode,
  regionName,
}: {
  variant: number;
  accent: string;
  regionCode: string;
  regionName: string;
}) {
  let birdArt;
  switch (variant) {
    case 0:
      birdArt = (
        <>
          <Path d="M28 15 C21 18 17 24 19 30 C20 35 23 39 27 41 C33 37 38 30 37 23 C36 19 32 16 28 15 Z" fill={accent} />
          <Path d="M26 39 C28 32 30 25 34 18" stroke={colors.ink} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <Path d="M27 35 L21 31 M28 31 L21 27 M30 27 L23 23 M32 23 L27 19 M28 35 L34 31 M30 30 L36 26 M32 25 L37 22" stroke={colors.paper} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case 1:
      birdArt = (
        <>
          <Circle cx={28} cy={27} r={17} fill="none" stroke={accent} strokeWidth={1.2} opacity={0.65} />
          <Path d="M28 9 L28 14 M46 27 L41 27 M28 45 L28 40 M10 27 L15 27 M15 14 L18 17 M41 14 L38 17" stroke={accent} strokeWidth={1.5} strokeLinecap="round" />
          <Polygon points="28,12 30,25 28,23 26,25" fill={colors.yellow} />
          <Polygon points="28,42 26,29 28,31 30,29" fill={colors.inkSoft} opacity={0.8} />
          <Path d="M20 36 C18 29 21 20 35 16 C36 27 31 36 22 39 Z" fill={accent} />
          <Path d="M21 38 C26 31 30 25 34 18 M25 32 L22 27 M28 28 L24 23 M30 25 L28 21 M27 31 L33 27 M29 27 L34 24" stroke={colors.paper} strokeWidth={1.1} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    case 2:
      birdArt = (
        <>
          <Path d="M14 37 C22 35 32 36 41 37" stroke={colors.inkSoft} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M18 35 C17 31 18 27 21 25 C23 22 28 22 31 25 C34 27 34 31 32 34 C28 37 22 37 18 35 Z" fill={accent} />
          <Path d="M21 29 C23 24 29 22 32 26 L29 30 C26 28 24 28 21 29 Z" fill={colors.paper} />
          <Circle cx={30} cy={26} r={1} fill={colors.ink} />
          <Polygon points="33,27 38,29 33,30" fill={colors.yellow} />
          <Path d="M15 34 C12 31 13 28 16 27 C18 29 18 32 15 34 Z M38 35 C36 31 38 28 42 28 C43 32 41 34 38 35 Z M22 22 C20 18 22 16 26 16 C28 19 26 21 22 22 Z" fill={colors.leafDeep} stroke={colors.inkSoft} strokeWidth={1} />
        </>
      );
      break;
    case 3:
      birdArt = (
        <>
          <Path d="M28 28 C22 24 17 18 10 17 C13 23 17 27 21 29 C17 28 13 30 11 34 C18 35 23 33 27 31 L28 35 L29 31 C33 33 38 35 45 34 C43 30 39 28 35 29 C39 27 43 23 46 17 C39 18 34 24 28 28 Z" fill={accent} />
          <Path d="M28 27 C25 25 24 22 25 20 C26 18 30 18 31 21 C32 23 30 26 28 27 Z M28 26 L28 34" fill={colors.inkSoft} stroke={colors.inkSoft} strokeWidth={1.3} strokeLinecap="round" />
          <Circle cx={29} cy={21} r={0.8} fill={colors.paper} />
          <Path d="M30 22 L34 23 L30 24" fill={colors.yellow} stroke={colors.yellow} strokeWidth={1} />
          <Path d="M14 22 L20 27 M42 22 L36 27 M15 31 L22 31 M41 31 L34 31" stroke={colors.paper} strokeWidth={1} strokeLinecap="round" opacity={0.9} />
        </>
      );
      break;
    case 4:
      birdArt = (
        <>
          <Path d="M28 13 L40 18 L39 30 C38 37 33 40 28 43 C23 40 18 37 17 30 L16 18 Z" fill={accent} opacity={0.92} />
          <Path d="M20 27 C23 23 26 22 28 24 C30 22 33 23 36 27 C33 29 31 30 28 30 C25 30 23 29 20 27 Z" fill={colors.paper} />
          <Path d="M28 24 C26 25 26 29 28 32 C30 29 30 25 28 24 Z" fill={colors.yellow} />
          <Circle cx={31} cy={25} r={0.8} fill={colors.ink} />
          <Path d="M22 32 C25 34 31 34 34 32" stroke={colors.paper} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </>
      );
      break;
    default:
      birdArt = (
        <>
          <Path d="M28 15 L24 11 L22 15 L18 12 L20 18 M28 15 L28 8 L31 13 L35 10 L34 17 M16 17 L12 14 M40 17 L44 14 M28 7 L28 5" stroke={colors.yellow} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M28 27 C22 23 17 18 9 16 C12 22 16 27 21 30 C17 28 12 29 10 33 C17 35 23 33 27 31 L28 37 L29 31 C33 33 39 35 46 33 C44 29 39 28 35 30 C40 27 44 22 47 16 C39 18 34 23 28 27 Z" fill={colors.yellow} />
          <Path d="M28 19 C25 19 24 22 25 25 C26 27 26 30 28 33 C30 30 30 27 31 25 C32 22 31 19 28 19 Z" fill={colors.yellow} stroke={colors.inkSoft} strokeWidth={1.1} />
          <Circle cx={29} cy={22} r={0.8} fill={colors.ink} />
          <Polygon points="31,23 35,24 31,25" fill={colors.coral} />
          <Path d="M14 21 L21 27 M42 21 L35 27 M14 31 L22 31 M42 31 L34 31" stroke={colors.coral} strokeWidth={1} fill="none" strokeLinecap="round" />
        </>
      );
  }

  const badgeLabel = universalRegionalRankDefinitions[variant]?.title ?? 'Regional rank';
  return (
    <Svg
      width={64}
      height={64}
      viewBox="0 0 56 56"
      accessibilityLabel={`${badgeLabel} bird badge for ${regionName}`}
      accessible
    >
      <Circle cx={28} cy={28} r={25} fill={colors.paper} stroke={accent} strokeWidth={2.4} />
      <Circle cx={28} cy={27} r={21} fill="none" stroke={accent} strokeWidth={0.7} opacity={0.35} />
      {birdArt}
      <Rect x={11} y={43} width={34} height={9} rx={4.5} fill={colors.ink} stroke={colors.paper} strokeWidth={0.8} />
      <SvgText
        x={28}
        y={49.6}
        textAnchor="middle"
        fontSize={5.5}
        fontWeight="700"
        letterSpacing={0.5}
        fill={colors.white}
      >
        {getRegionBadgeLabel(regionCode)}
      </SvgText>
    </Svg>
  );
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function RanksScreen() {
  const { observations } = useSavedBirds();
  const [selectedRegionCode, setSelectedRegionCode] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<RegionChecklist | null>(null);
  const [checklistMessage, setChecklistMessage] = useState<string | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [achievements, setAchievements] = useState<RegionalAchievement[]>([]);
  const [achievementMessage, setAchievementMessage] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);

  const selectedRegion = useMemo(
    () => findPhilippineRegion(selectedRegionCode),
    [selectedRegionCode],
  );

  useEffect(() => {
    let active = true;
    let loadedUserId: string | null = null;
    const loadProfile = async () => {
      if (!supabase) {
        if (!active) return;
        setProfileError('Wingdex account sync is unavailable. Configure Supabase to save a home region.');
        setProfileLoading(false);
        return;
      }
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const userId = sessionData.session?.user.id;
        if (!userId) {
          if (!active) return;
          setProfileError('Sign in to your Wingdex account to choose and save a home region.');
          setProfileLoading(false);
          return;
        }
        loadedUserId = userId;
        if (active) setAccountUserId(userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('home_region_code')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        const regionCode = typeof data?.home_region_code === 'string'
          ? findPhilippineRegion(data.home_region_code)?.code ?? null
          : null;
        if (!active) return;
        setSelectedRegionCode(regionCode);
        setProfileError(null);
        if (regionCode) {
          await AsyncStorage.setItem(`${storageKey}.${userId}`, regionCode).catch(() => undefined);
        }
      } catch {
        if (!active) return;
        const cached = loadedUserId ? await AsyncStorage.getItem(`${storageKey}.${loadedUserId}`).catch(() => null) : null;
        setSelectedRegionCode(cached ? findPhilippineRegion(cached)?.code ?? null : null);
        setProfileError(cached
          ? 'Could not refresh your profile. Showing the saved device copy; reconnect to verify your home region.'
          : 'Could not load your Wingdex profile. Reconnect and retry before choosing a home region.');
      } finally {
        if (active) setProfileLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, [profileRetry]);

  const selectHomeRegion = async (regionCode: string) => {
    const region = findPhilippineRegion(regionCode);
    if (!region || !supabase || !accountUserId || profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ home_region_code: region.code, home_region_name: region.name })
        .eq('id', accountUserId)
        .select('id')
        .single();
      if (error) throw error;
      await AsyncStorage.setItem(`${storageKey}.${accountUserId}`, region.code);
      setSelectedRegionCode(region.code);
      setRegionPickerOpen(false);
      setChecklist(null);
      setChecklistMessage(null);
    } catch {
      setProfileError('Your home region could not be saved to your Wingdex profile. Check your connection and try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (!selectedRegion) return;
    let active = true;
    const run = async () => {
      const backendUrl = process.env.EXPO_PUBLIC_WINGDEX_API_URL?.replace(/\/+$/, '');
      if (!backendUrl) {
        if (!active) return;
        setChecklist(null);
        setChecklistMessage('Wingdex backend is not configured. Configure EXPO_PUBLIC_WINGDEX_API_URL to refresh a checklist snapshot.');
        return;
      }

      if (!active) return;
      setLoadingChecklist(true);
      setChecklistMessage(null);
      try {
        const response = await fetch(`${backendUrl}/ebird/checklists/${encodeURIComponent(selectedRegion.code)}/spplist`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || typeof payload !== 'object') {
          throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not load the eBird checklist snapshot for this region.');
        }
        if (!Array.isArray(payload.speciesCodes)
          || payload.speciesCodes.some((code: unknown) => typeof code !== 'string')
          || typeof payload.eligibleSpeciesCount !== 'number'
          || payload.eligibleSpeciesCount !== payload.speciesCodes.length
          || typeof payload.valueHash !== 'string'
          || typeof payload.version !== 'string'
          || typeof payload.asOf !== 'string') {
          throw new Error('The active regional checklist is incomplete or inconsistent. Ask an administrator to refresh it.');
        }
        const speciesCodes = payload.speciesCodes as string[];
        const eligible = speciesCodes.length;
        if (!active) return;
        setChecklist({
          version: typeof payload.version === 'string' ? payload.version : 'ebird-product-spplist',
          regionCode: typeof payload.regionCode === 'string' ? payload.regionCode : selectedRegion.code,
          regionName: typeof payload.regionName === 'string' ? payload.regionName : selectedRegion.name,
          eligibleSpeciesCount: eligible,
          snapshotDate: typeof payload.snapshotDate === 'string' ? payload.snapshotDate : '',
          source: 'ebird-product-spplist',
          valueHash: typeof payload.valueHash === 'string' ? payload.valueHash : '',
          asOf: typeof payload.asOf === 'string' ? payload.asOf : '',
          speciesCodes,
          sourceRegionCodes: Array.isArray(payload.sourceRegionCodes)
            ? payload.sourceRegionCodes.filter((code: unknown): code is string => typeof code === 'string')
            : [],
        });
        setChecklistMessage(null);
      } catch (error) {
        if (!active) return;
        setChecklist(null);
        setChecklistMessage(error instanceof Error ? error.message : "This region's checklist is temporarily unavailable.");
      } finally {
        if (active) setLoadingChecklist(false);
      }
    };

    void run();
    return () => { active = false; };
  }, [selectedRegion]);

  const activeChecklist = checklist && selectedRegion && checklist.regionCode === selectedRegion.code ? checklist : null;
  const qualifyingResult = useMemo(() => collectQualifyingSpeciesForRegion({
    observations,
    region: selectedRegion,
    speciesCodes: activeChecklist?.speciesCodes ?? [],
  }), [observations, selectedRegion, activeChecklist]);

  const progress = useMemo(() => calculateRegionalProgress(
    activeChecklist?.eligibleSpeciesCount ?? 0,
    activeChecklist ? qualifyingResult.count : 0,
    Boolean(activeChecklist),
    profileError ?? undefined,
  ), [activeChecklist, profileError, qualifyingResult.count]);

  const progressUnavailableMessage = profileLoading
    ? 'Loading your saved home region…'
    : loadingChecklist
      ? 'Loading the verified regional checklist…'
      : selectedRegion
        ? 'Progress is unavailable until a verified checklist is published.'
        : 'Choose a home region to calculate progress.';
  const regionAchievements = achievements.filter((achievement) => achievement.region_code === selectedRegion?.code);
  const achievedRank = [...universalRegionalRankDefinitions].reverse().find((rank) =>
    regionAchievements.some((achievement) => achievement.rank_code === rank.id),
  ) ?? null;
  const progressRankIndex = progress.currentRank
    ? universalRegionalRankDefinitions.findIndex((rank) => rank.id === progress.currentRank?.id)
    : -1;
  const achievedRankIndex = achievedRank
    ? universalRegionalRankDefinitions.findIndex((rank) => rank.id === achievedRank.id)
    : -1;
  const effectiveRank = universalRegionalRankDefinitions[Math.max(progressRankIndex, achievedRankIndex)] ?? null;
  const currentRankLabel = effectiveRank?.title ?? (activeChecklist ? 'No rank unlocked' : 'Checklist pending');
  const nextRank = progress.nextRank ?? null;
  const nextNeed = achievedRankIndex > progressRankIndex
    ? `Achievement retained from ${regionAchievements.find((achievement) => achievement.rank_code === achievedRank?.id)?.checklist_version ?? 'an earlier checklist'}`
    : nextRank
      ? `${formatCount(progress.requiredMore, 'more species')} to ${nextRank.title}`
      : 'Checklist complete';

  const rankCards = useMemo(() => universalRegionalRankDefinitions.map((card, index) => ({
    ...card,
    threshold: activeChecklist ? progress.thresholds[index] ?? progress.totalEligibleSpecies : null,
    unlocked: Boolean(
      selectedRegion
      && (
        regionAchievements.some((achievement) => achievement.rank_code === card.id)
        || (activeChecklist
          && progress.thresholds[index] > 0
          && progress.totalQualifyingSpecies >= progress.thresholds[index])
      ),
    ),
  })), [activeChecklist, progress, regionAchievements, selectedRegion]);

  useEffect(() => {
    if (!selectedRegion || !accountUserId || !activeChecklist) return;
    let active = true;
    const cacheKey = `${storageKey}.${accountUserId}.achievements.${selectedRegion.code}`;
    const syncAchievements = async () => {
      const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
      if (cached && active) {
        try {
          const parsed: unknown = JSON.parse(cached);
          if (Array.isArray(parsed)) setAchievements(parsed as RegionalAchievement[]);
        } catch {
          await AsyncStorage.removeItem(cacheKey).catch(() => undefined);
        }
      }

      const backendUrl = process.env.EXPO_PUBLIC_WINGDEX_API_URL?.replace(/\/+$/, '');
      if (!backendUrl || !supabase) {
        if (active) setAchievementMessage('Previously earned ranks will sync when your observations are uploaded.');
        return;
      }
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error('Sign in to sync earned regional ranks.');
        const response = await fetch(`${backendUrl}/regional-ranks/achievements`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ regionCode: selectedRegion.code }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || typeof payload !== 'object'
          || !('achievements' in payload) || !Array.isArray(payload.achievements)) {
          throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'Could not sync earned regional ranks.');
        }
        const synced = payload.achievements.filter((item: unknown): item is RegionalAchievement =>
          typeof item === 'object' && item !== null
          && 'rank_code' in item && typeof item.rank_code === 'string'
          && 'checklist_version' in item && typeof item.checklist_version === 'string'
          && 'unlocked_at' in item && typeof item.unlocked_at === 'string',
        ).map((item: RegionalAchievement) => ({ ...item, region_code: selectedRegion.code }));
        if (!active) return;
        setAchievements((current) => [
          ...current.filter((item) => item.region_code !== selectedRegion.code),
          ...synced,
        ]);
        setAchievementMessage(null);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(synced)).catch(() => undefined);
      } catch (error) {
        if (active) setAchievementMessage(error instanceof Error ? error.message : 'Previously earned ranks could not be refreshed.');
      }
    };
    void syncAchievements();
    return () => { active = false; };
  }, [accountUserId, activeChecklist, observations, selectedRegion]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Regional ranks"
          eyebrow="PHILIPPINE FIELD JOURNEY"
          subtitle="Track your progress using one home region at a time."
          accessory={
            <View style={styles.headerMark}><MapPin color={colors.ink} size={20} /></View>
          }
        />

        <View style={styles.regionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.regionPill}><Shield color={colors.yellow} size={17} /></View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardEyebrow}>ACCOUNT HOME REGION</Text>
              <Text style={styles.cardTitle}>
                {profileLoading ? 'Loading your profile…' : selectedRegion?.name ?? 'Choose a home region'}
              </Text>
            </View>
            {!profileLoading && accountUserId && (
              <Pressable
                style={styles.changeRegionButton}
                onPress={() => setRegionPickerOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel={selectedRegion ? 'Change home region' : 'Choose home region'}
                disabled={profileSaving}
              >
                <Text style={styles.changeRegionLabel}>{profileSaving ? 'Saving…' : selectedRegion ? 'Change' : 'Choose'}</Text>
                <ChevronDown color={colors.ink} size={16} />
              </Pressable>
            )}
          </View>

          {regionPickerOpen && (
            <ScrollView style={styles.regionPicker} nestedScrollEnabled>
              {philippineRegions.map((region) => {
                const active = region.code === selectedRegion?.code;
                return (
                  <Pressable
                    key={region.code}
                    onPress={() => void selectHomeRegion(region.code)}
                    style={[styles.regionOption, active && styles.regionOptionActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${region.name} as home region`}
                    disabled={profileSaving}
                  >
                    <Text style={[styles.regionOptionName, active && styles.regionOptionNameActive]}>{region.name}</Text>
                    <Text style={styles.regionOptionCode}>{region.code}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {profileLoading && <ActivityIndicator color={colors.inkSoft} style={styles.loader} />}
          {profileError && (
            <View>
              <Text style={styles.notice}>{profileError}</Text>
              <Pressable onPress={() => { setProfileLoading(true); setProfileRetry((attempt) => attempt + 1); }} accessibilityRole="button">
                <Text style={styles.retryLabel}>Retry profile</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>CHECKLIST</Text>
              <Text style={styles.summaryValue}>{loadingChecklist ? 'Loading…' : activeChecklist ? activeChecklist.eligibleSpeciesCount.toLocaleString() : '—'}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>QUALIFYING</Text>
              <Text style={styles.summaryValue}>{activeChecklist ? progress.totalQualifyingSpecies : '—'}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>CURRENT</Text>
              <Text style={styles.summaryValue}>{currentRankLabel}</Text>
            </View>
          </View>

          {checklistMessage ? (
            <Text style={styles.notice}>{checklistMessage}</Text>
          ) : activeChecklist ? (
            <Text style={styles.notice}>
              Checklist {activeChecklist.version} · {activeChecklist.snapshotDate || activeChecklist.asOf} · {selectedRegion?.name}
            </Text>
          ) : selectedRegion ? (
            <Text style={styles.notice}>No published checklist is available for {selectedRegion.name} yet.</Text>
          ) : (
            <Text style={styles.notice}>Choose a home region to load its published checklist.</Text>
          )}

          {loadingChecklist && <ActivityIndicator color={colors.inkSoft} style={styles.loader} />}
          {achievementMessage && <Text style={styles.notice}>{achievementMessage}</Text>}
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressEyebrow}>REGIONAL PROGRESS</Text>
              <Text style={styles.rankTitle}>{currentRankLabel}</Text>
            </View>
            <View style={styles.rankBadge}><Bird color={colors.ink} size={22} /></View>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countValue}>{activeChecklist ? progress.totalQualifyingSpecies : '—'}</Text>
            <Text style={styles.countLabel}>
              {activeChecklist
                ? `qualifying species in ${selectedRegion?.name}`
                : 'regional progress unavailable'}
            </Text>
          </View>

          {activeChecklist ? (
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel={`${selectedRegion?.name ?? 'Regional'} checklist progress`}
              accessibilityValue={{
                min: 0,
                max: activeChecklist.eligibleSpeciesCount,
                now: progress.totalQualifyingSpecies,
                text: `${progress.totalQualifyingSpecies} of ${activeChecklist.eligibleSpeciesCount} species, ${progress.percentageComplete.toFixed(1)} percent`,
              }}
              accessibilityLiveRegion="polite"
            >
              <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, progress.percentageComplete))}%` }]} />
            </View>
          ) : (
            <View style={styles.progressUnavailable}>
              <Text style={styles.progressUnavailableText} accessibilityLiveRegion="polite">
                {progressUnavailableMessage}
              </Text>
            </View>
          )}

          <View style={styles.progressMeta}>
            <Text style={styles.metaText}>
              {activeChecklist ? `${progress.percentageComplete.toFixed(1)}% of the current checklist` : 'No count is assumed without a valid checklist.'}
            </Text>
            <Text style={styles.metaText}>{activeChecklist ? nextNeed : 'Checklist unavailable'}</Text>
          </View>
        </View>

        <View style={styles.rankGrid}>
          {rankCards.map((rank, index) => {
            const isUnlocked = rank.unlocked;
            return (
              <View
                key={rank.id}
                style={[styles.rankCard, isUnlocked && styles.rankCardUnlocked]}
                accessible
                accessibilityRole="text"
                accessibilityLabel={`${rank.title}, ${isUnlocked ? 'unlocked' : activeChecklist ? `requires ${rank.threshold} species` : 'checklist pending'}, ${selectedRegion?.name ?? 'no home region selected'}`}
              >
                <View style={[styles.rankMark, isUnlocked && styles.rankMarkUnlocked, { borderColor: getRegionAccent(selectedRegion?.code ?? 'PH') }]}>
                  {isUnlocked ? <Check color={colors.ink} size={17} /> : <LockKeyhole color={colors.muted} size={16} />}
                  <View style={[styles.ring, { backgroundColor: getRegionAccent(selectedRegion?.code ?? 'PH') }]} />
                </View>
                <View style={styles.rankBadgeWrap}>
                  <RegionalBadgeMark
                    variant={index}
                    accent={getRegionAccent(selectedRegion?.code ?? 'PH')}
                    regionCode={selectedRegion?.code ?? 'PH'}
                    regionName={selectedRegion?.name ?? 'your home region'}
                  />
                </View>
                <Text style={styles.rankName}>{rank.title}</Text>
                <Text style={styles.rankDetail}>{rank.description}</Text>
                <Text style={styles.rankThreshold}>
                  {isUnlocked ? 'UNLOCKED' : activeChecklist ? `${rank.threshold?.toLocaleString()} SPECIES` : 'CHECKLIST PENDING'}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.boundaryAttribution}>
          Boundaries: geoBoundaries PHL ADM2 (2020/2023), from NAMRIA, PSA and OCHA Philippines; CC BY 3.0 IGO.
          Province/city polygons are dissolved by current PSA PSGC assignments. Bacolod City is included in NIR under RA 12000 §3(a).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  headerMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EEF1E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DBE0D8',
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  regionPill: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3E7B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardEyebrow: {
    color: colors.inkSoft,
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  changeRegionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  changeRegionLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  regionPicker: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: '#DBE0D8',
    borderRadius: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FBFCF8',
  },
  regionOption: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EBE4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  regionOptionActive: {
    backgroundColor: '#EEF3EE',
  },
  regionOptionName: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  regionOptionNameActive: {
    color: colors.ink,
    fontWeight: '800',
  },
  regionOptionCode: {
    color: colors.inkSoft,
    fontSize: 12,
    letterSpacing: 0.5,
    marginLeft: 8,
  },
  retryLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#F4F5F0',
    borderRadius: 12,
    padding: 10,
    minHeight: 72,
    justifyContent: 'center',
  },
  summaryLabel: {
    color: colors.inkSoft,
    fontSize: 12,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  notice: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  loader: {
    marginTop: 10,
  },
  progressCard: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressEyebrow: {
    color: '#C7D7C8',
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  rankTitle: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '700',
    marginTop: 2,
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E7D182',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  countValue: {
    color: colors.white,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1,
    marginRight: 8,
  },
  countLabel: {
    color: '#CBDBCF',
    fontSize: 14,
    fontWeight: '600',
  },
  progressUnavailable: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#789084',
    backgroundColor: '#263D33',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressUnavailableText: {
    color: '#F1F5EF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#4E685D',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.leafDeep,
    borderRadius: 999,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  metaText: {
    color: '#D9E7D8',
    fontSize: 13,
    flexShrink: 1,
    lineHeight: 19,
  },
  rankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  rankCard: {
    width: '48%',
    backgroundColor: '#F7F5EF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE3DA',
    padding: 12,
  },
  rankCardUnlocked: {
    backgroundColor: '#EEF3EB',
    borderColor: '#C9D7C7',
  },
  rankMark: {
    position: 'relative',
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMarkUnlocked: {
    borderColor: '#9DBBA2',
    backgroundColor: '#E6F2E8',
  },
  ring: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 999,
    bottom: 4,
    right: 4,
    opacity: 0.9,
  },
  rankBadgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  rankName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  rankDetail: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  rankThreshold: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  boundaryAttribution: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
  },
});
