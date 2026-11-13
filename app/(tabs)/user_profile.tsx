import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpenText,
  Check,
  ChevronRight,
  Download,
  Feather,
  ImagePlus,
  Leaf,
  LockKeyhole,
  QrCode,
  Share2,
  ShieldCheck,
  Trophy,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { birds } from '../../src/data/birds';
import { worldBirds } from '../../src/data/world-birds';
import {
  getBirdingLicenseProfile,
  getProfilePhotoUrl,
  getPublicLicenseUrl,
  saveBirdingLicenseProfile,
  uploadProfilePhoto,
  type BirdingLicenseProfile,
} from '../../src/services/birdingLicense';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import { findPhilippineRegion, philippineRegions, regionalBadgeIdentities } from '../../src/data/philippineRegions';
import {
  calculateRegionalProgress,
  collectQualifyingSpeciesForRegion,
  universalRegionalRankDefinitions,
} from '../../src/services/regionalRanks';
import { minimumObservationConfidence } from '../../src/services/observationRules';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme';
import { RegionalBadgeMark } from '../../src/components/RegionalBadgeMark';

type ProfileTab = 'license' | 'badges' | 'discoveries' | 'settings';
type RegionalAchievement = { rank_code: string; checklist_version: string; unlocked_at: string };
const tabItems: { id: ProfileTab; label: string; icon: typeof BadgeCheck }[] = [
  { id: 'license', label: 'License', icon: BadgeCheck },
  { id: 'badges', label: 'Badges', icon: Trophy },
  { id: 'discoveries', label: 'Discoveries', icon: BookOpenText },
  { id: 'settings', label: 'Settings', icon: Feather },
];
const birdNamesById = new Map([...birds, ...worldBirds].map((bird) => [bird.id, bird.name]));

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function buildLicensePdfHtml({
  profile,
  currentRankTitle,
  regionBadgeTitle,
  speciesCount,
  achievements,
  favoriteBirds,
  publicUrl,
}: {
  profile: BirdingLicenseProfile;
  currentRankTitle: string;
  regionBadgeTitle: string;
  speciesCount: number;
  achievements: RegionalAchievement[];
  favoriteBirds: string[];
  publicUrl: string | null;
}) {
  const badgeItems = [...achievements]
    .sort((first, second) =>
      universalRegionalRankDefinitions.findIndex((rank) => rank.id === first.rank_code)
      - universalRegionalRankDefinitions.findIndex((rank) => rank.id === second.rank_code))
    .map((achievement) => {
      const rank = universalRegionalRankDefinitions.find((item) => item.id === achievement.rank_code);
      return rank
        ? `<div class="badge"><strong>${escapeHtml(rank.title)}</strong><span>Earned ${escapeHtml(new Date(achievement.unlocked_at).toLocaleDateString())}</span></div>`
        : '';
    })
    .filter(Boolean)
    .join('');
  const favoriteItems = favoriteBirds.length > 0
    ? favoriteBirds.map((birdName, index) => `<div class="favorite"><b>0${index + 1}</b>${escapeHtml(birdName)}</div>`).join('')
    : '<div class="empty">No favorite birds listed yet.</div>';
  const displayName = escapeHtml(profile.display_name);
  const initials = escapeHtml(profile.display_name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'B');
  const safePublicUrl = publicUrl ? escapeHtml(publicUrl) : '';
  const publicLink = publicUrl
    ? `<a href="${safePublicUrl}">View your public license · ${safePublicUrl}</a>`
    : 'Public license link unavailable';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: landscape; margin: 0; }
      html, body { margin: 0; width: 842px; height: 595px; background: #f2f1e9; font-family: Arial, Helvetica, sans-serif; }
      .sheet { width: 842px; height: 595px; padding: 60px 24px; display: flex; align-items: center; justify-content: center; gap: 20px; }
      .card { position: relative; overflow: hidden; width: 387px; height: 260px; padding: 20px; color: #f6f0df; background: #1c382b; border: 1px solid #b89d68; border-radius: 12px; }
      .card:after { content: ""; position: absolute; width: 190px; height: 190px; right: -80px; top: 60px; border: 1px solid rgba(230,215,181,.14); border-radius: 50%; pointer-events: none; }
      .header { display: flex; align-items: center; justify-content: space-between; }
      .wordmark { font-size: 15px; font-weight: 900; letter-spacing: 2px; }
      .caption, .kicker { color: #bfcdbe; font-size: 8px; font-weight: 700; letter-spacing: 1px; margin-top: 4px; }
      .stamp { padding: 8px 6px; color: #d8be87; border: 1px solid #c8ac70; border-radius: 50%; font-size: 8px; font-weight: 900; letter-spacing: .5px; text-align: center; }
      .rule { height: 1px; margin: 12px 0; background: rgba(229,219,192,.3); }
      .identity { display: flex; align-items: center; gap: 10px; }
      .initials { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; color: #e6d7b5; background: #45614f; border: 1px solid #d8be87; border-radius: 50%; font-size: 15px; font-weight: 800; }
      .name { max-width: 260px; overflow: hidden; color: #fbf7ec; font-size: 15px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
      .handle { color: #c7d3c8; font-size: 9px; margin-top: 3px; }
      .rank { color: #e4d2a7; font-size: 9px; font-weight: 800; letter-spacing: .4px; margin-top: 5px; }
      .details { display: flex; justify-content: space-between; gap: 12px; margin-top: 14px; }
      .meta { min-width: 0; }
      .label { color: #b8c6ba; font-size: 8px; font-weight: 800; letter-spacing: .8px; }
      .value { color: #f8f3e4; font-size: 11px; font-weight: 800; margin-top: 4px; }
      .region { color: #e5e8dc; font-size: 9px; font-weight: 700; margin-top: 11px; }
      .region-badge, .species { color: #d9c793; font-size: 8px; margin-top: 3px; }
      .favorite-one { color: #d9c793; font-size: 8px; font-weight: 700; margin-top: 9px; }
      .link { position: absolute; left: 20px; right: 20px; bottom: 13px; overflow: hidden; color: #d9e7a9; font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
      .link a { color: inherit; text-decoration: none; }
      .reverse-title { color: #d8be87; font-size: 9px; font-weight: 900; letter-spacing: .9px; margin-top: 6px; }
      .intro { color: #d5ded3; font-size: 9px; line-height: 1.4; margin-top: 8px; }
      .badges { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; margin-top: 7px; }
      .badge { min-width: 0; padding: 5px 7px; background: rgba(255,255,255,.07); border-left: 2px solid #d8be87; }
      .badge strong, .badge span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .badge strong { color: #f6f0df; font-size: 8px; }
      .badge span { color: #bfcdbe; font-size: 7px; margin-top: 2px; }
      .favorites { display: flex; gap: 7px; margin-top: 7px; }
      .favorite { min-width: 0; flex: 1; padding: 5px 6px; overflow: hidden; color: #f6f0df; background: rgba(255,255,255,.07); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
      .favorite b { color: #d8be87; margin-right: 5px; }
      .empty { color: #d5ded3; font-size: 8px; margin-top: 6px; }
      .conservation { position: absolute; left: 20px; bottom: 13px; color: #bfcdbe; font-size: 7px; font-weight: 900; letter-spacing: .6px; }
    </style>
  </head>
  <body>
    <main class="sheet">
      <section class="card">
        <div class="header"><div><div class="wordmark">WINGDEX</div><div class="caption">BIRD WATCHER LICENSE</div></div><div class="stamp">FIELD<br />ISSUED</div></div>
        <div class="rule"></div>
        <div class="identity"><div class="initials">${initials}</div><div><div class="name">${displayName}</div><div class="handle">@${escapeHtml(profile.username)}</div><div class="rank">${escapeHtml(currentRankTitle)}</div></div></div>
        <div class="details">
          <div class="meta"><div class="label">LICENSE NUMBER</div><div class="value">${escapeHtml(profile.license_number)}</div><div class="region">${escapeHtml(profile.home_region_name)}</div><div class="region-badge">${escapeHtml(regionBadgeTitle)}</div><div class="species">${speciesCount.toLocaleString()} recorded species</div>${favoriteBirds[0] ? `<div class="favorite-one">FAVORITE · ${escapeHtml(favoriteBirds[0])}</div>` : ''}</div>
          <div class="meta" style="text-align:right"><div class="label">ISSUED</div><div class="value">${escapeHtml(new Date(profile.license_issued_at).toLocaleDateString())}</div></div>
        </div>
        <div class="link">${publicLink}</div>
      </section>
      <section class="card">
        <div class="header"><div><div class="wordmark">WINGDEX</div><div class="caption">LICENSE REVERSE · FIELD NOTES</div></div></div>
        <div class="rule"></div>
        <div class="intro">A life of looking closer, and the field badges earned along the way.</div>
        <div class="reverse-title">REGIONAL FIELD BADGES</div>
        <div class="badges">${badgeItems || '<div class="empty">Your regional badges will appear here as you reach their thresholds.</div>'}</div>
        <div class="reverse-title">TOP 3 FAVORITE BIRDS</div>
        <div class="favorites">${favoriteItems}</div>
        <div class="conservation">PROTECT THE HABITAT. THE BIRDS WILL FOLLOW.</div>
      </section>
    </main>
  </body>
</html>`;
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { authNotice } = useLocalSearchParams<{ authNotice?: string }>();
  const { observations, savedIds, syncing, retrySync } = useSavedBirds();
  const [profile, setProfile] = useState<BirdingLicenseProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [achievements, setAchievements] = useState<RegionalAchievement[]>([]);
  const [computedRank, setComputedRank] = useState<{ regionCode: string; rankCode: string | null } | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('license');
  const [showReverse, setShowReverse] = useState(false);
  const [licenseFlip] = useState(() => new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [licenseAction, setLicenseAction] = useState<'share' | 'download' | null>(null);
  const [notice, setNotice] = useState<string | null>(authNotice ?? null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCountry, setEditCountry] = useState('Philippines');
  const [editCity, setEditCity] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editFavorite, setEditFavorite] = useState('');
  const [editCategories, setEditCategories] = useState('');
  const [editInterests, setEditInterests] = useState('');
  const [editRegionCode, setEditRegionCode] = useState<BirdingLicenseProfile['home_region_code']>('NCR');
  const [editDiscoveryRegion, setEditDiscoveryRegion] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);

  const regionIdentity = profile ? regionalBadgeIdentities[profile.home_region_code] : null;
  const licenseBadgeIdentity = regionIdentity ?? regionalBadgeIdentities.NCR;
  const speciesCount = useMemo(() => new Set(observations
    .map((item) => item.ebirdSpecies?.category === 'species'
      && item.confidence >= minimumObservationConfidence
      ? item.ebirdSpecies.speciesCode.toLowerCase()
      : null)
    .filter((code): code is string => Boolean(code))).size, [observations]);
  const publicUrl = profile ? getPublicLicenseUrl(profile.license_number) : null;
  const currentRank = useMemo(() => [...universalRegionalRankDefinitions].reverse().find((rank) =>
    achievements.some((achievement) => achievement.rank_code === rank.id)
      || (computedRank?.regionCode === profile?.home_region_code && computedRank?.rankCode === rank.id),
  ) ?? universalRegionalRankDefinitions[0], [achievements, computedRank, profile?.home_region_code]);
  const currentRankIndex = universalRegionalRankDefinitions.findIndex((rank) => rank.id === currentRank.id);
  const favoriteBirds = useMemo(() => {
    const names = [profile?.favorite_bird, ...savedIds.map((id) => birdNamesById.get(id))]
      .filter((name): name is string => Boolean(name?.trim()))
      .map((name) => name.trim());
    return [...new Set(names)].slice(0, 3);
  }, [profile?.favorite_bird, savedIds]);

  const shareLicense = async () => {
    if (!publicUrl) {
      setError('Public license sharing is unavailable. Check the public license URL configuration.');
      return;
    }
    setError(null);
    setNotice(null);
    setLicenseAction('share');
    try {
      await Share.share({
        title: 'My WingDex birding license',
        message: `View my WingDex birding license: ${publicUrl}`,
        url: publicUrl,
      });
    } catch (shareError) {
      if (Platform.OS === 'web' && shareError instanceof Error
        && shareError.message === 'Share is not supported in this browser') {
        try {
          await Clipboard.setStringAsync(publicUrl);
          setNotice('Public license link copied to the clipboard.');
        } catch (clipboardError) {
          setError(clipboardError instanceof Error ? clipboardError.message : 'The public license link could not be copied.');
        }
        return;
      }
      setError(shareError instanceof Error ? shareError.message : 'Your license link could not be shared.');
    } finally {
      setLicenseAction(null);
    }
  };

  const downloadLicense = async () => {
    if (!profile) return;
    setError(null);
    setNotice(null);
    setLicenseAction('download');
    let printWindow: Window | null = null;
    try {
      if (Platform.OS === 'web') {
        printWindow = window.open('', '_blank');
        if (!printWindow) throw new Error('Allow pop-ups for WingDex to download your license.');
      }
      const html = buildLicensePdfHtml({
        profile,
        currentRankTitle: currentRank.title,
        regionBadgeTitle: regionIdentity?.title ?? profile.home_region_name,
        speciesCount,
        achievements,
        favoriteBirds,
        publicUrl,
      });
      if (Platform.OS === 'web') {
        const targetWindow = printWindow;
        if (!targetWindow) throw new Error('The license print window could not be opened.');
        targetWindow.onload = () => {
          targetWindow.focus();
          targetWindow.print();
        };
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        setNotice('Choose “Save as PDF” in the print dialog to download both sides.');
        return;
      }
      const pdf = await Print.printToFileAsync({ html, width: 842, height: 595 });
      if (!await Sharing.isAvailableAsync()) {
        throw new Error('Your license PDF was created, but file sharing is unavailable on this device.');
      }
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save your WingDex license',
        UTI: 'com.adobe.pdf',
      });
      setNotice('Choose a destination from the share sheet to save or share your license PDF.');
    } catch (downloadError) {
      printWindow?.close();
      setError(downloadError instanceof Error ? downloadError.message : 'Your license PDF could not be created.');
    } finally {
      setLicenseAction(null);
    }
  };

  useEffect(() => {
    const animation = Animated.timing(licenseFlip, {
      toValue: showReverse ? 1 : 0,
      duration: 480,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [licenseFlip, showReverse]);

  const frontRotation = licenseFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const reverseRotation = licenseFlip.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const current = await getBirdingLicenseProfile();
      const [photo, session, achievementResult] = await Promise.all([
        getProfilePhotoUrl(current.avatar_path),
        supabase?.auth.getSession(),
        supabase
          ? supabase.from('regional_rank_achievements')
            .select('rank_code,checklist_version,unlocked_at')
            .eq('region_code', current.home_region_code)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (achievementResult.error) throw achievementResult.error;
      setProfile(current);
      setAvatarUrl(photo);
      setAchievements((achievementResult.data ?? []) as RegionalAchievement[]);
      setEmail(session?.data.session?.user.email ?? '');
      setEditUsername(current.username);
      setEditDisplayName(current.display_name);
      setEditCountry(current.country || 'Philippines');
      setEditCity(current.city ?? '');
      setEditBio(current.bio ?? '');
      setEditFavorite(current.favorite_bird ?? '');
      setEditCategories(current.preferred_categories.join(', '));
      setEditInterests(current.interests.join(', '));
      setEditRegionCode(current.home_region_code);
      setEditDiscoveryRegion(current.preferred_discovery_region ?? current.home_region_name);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Your license could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadProfile();
  }, [loadProfile]));

  useEffect(() => {
    if (!profile) return;
    let active = true;
    const regionCode = profile.home_region_code;
    void Promise.resolve().then(async () => {
      const backendUrl = process.env.EXPO_PUBLIC_WINGDEX_API_URL?.replace(/\/+$/, '');
      if (!backendUrl) {
        if (active) setComputedRank({ regionCode, rankCode: null });
        return;
      }
      try {
        const response = await fetch(`${backendUrl}/ebird/checklists/${encodeURIComponent(regionCode)}/spplist`);
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || typeof payload !== 'object'
          || !('speciesCodes' in payload) || !Array.isArray(payload.speciesCodes)
          || payload.speciesCodes.some((code: unknown) => typeof code !== 'string')
          || !('eligibleSpeciesCount' in payload) || typeof payload.eligibleSpeciesCount !== 'number'
          || payload.eligibleSpeciesCount !== payload.speciesCodes.length) {
          throw new Error('Regional rank data is not ready.');
        }
        const selectedRegion = findPhilippineRegion(regionCode);
        const qualifying = collectQualifyingSpeciesForRegion({
          observations,
          region: selectedRegion,
          speciesCodes: payload.speciesCodes,
        });
        const progress = calculateRegionalProgress(
          payload.eligibleSpeciesCount,
          qualifying.count,
          qualifying.status === 'ready',
        );
        if (active) setComputedRank({ regionCode, rankCode: progress.currentRank?.id ?? null });
      } catch {
        if (active) setComputedRank({ regionCode, rankCode: null });
      }
    });
    return () => { active = false; };
  }, [observations, profile]);

  const saveEdits = async () => {
    if (!profile) return;
    const selectedRegion = findPhilippineRegion(editRegionCode);
    if (!selectedRegion) {
      setError('Choose a valid Philippine home region.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBirdingLicenseProfile({
        username: editUsername.trim().toLowerCase(),
        displayName: editDisplayName.trim(),
        country: editCountry.trim() || 'Philippines',
        city: editCity.trim(),
        bio: editBio.trim(),
        homeRegionCode: selectedRegion.code,
        homeRegionName: selectedRegion.name,
        favoriteBird: editFavorite.trim(),
        preferredCategories: editCategories.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 12),
        interests: editInterests.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20),
        preferredDiscoveryRegion: editDiscoveryRegion.trim(),
      });
      await loadProfile();
      setNotice('Your license details have been saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your changes could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to choose a profile image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setPhotoSaving(true);
    setError(null);
    try {
      const asset = result.assets[0];
      const nextUrl = await uploadProfilePhoto(asset.uri, asset.mimeType, asset.fileName);
      setAvatarUrl(nextUrl);
      await loadProfile();
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Your photo could not be saved.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    setSigningOut(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} size="large" />
          <Text style={styles.loadingText}>Opening your field license…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <LockKeyhole color={colors.inkSoft} size={25} />
          <Text style={styles.sectionTitle}>Your license is private to your account</Text>
          <Text style={styles.mutedBody}>{error ?? 'Sign in and complete your profile to issue your field license.'}</Text>
          <Pressable onPress={() => router.replace('/complete-profile' as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue profile setup</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(100, insets.bottom + 86) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topline}>
            <View style={styles.brandMark}><Leaf color={colors.paper} size={18} /></View>
            <View style={styles.brandCopy}>
              <Text style={styles.wordmark}>WINGDEX <Text style={styles.wordmarkSub}>FIELD LICENSE</Text></Text>
              <Text style={styles.toplineHint}>A personal record of the wild.</Text>
            </View>
            <View accessibilityLabel="Public license" style={[styles.privacyPill, styles.privacyPillPublic]}>
              <ShieldCheck color={colors.ink} size={13} />
              <Text style={styles.privacyPillText}>PUBLIC</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>YOUR PERSONAL FIELD CREDENTIAL</Text>
            <Text style={styles.pageTitle}>Birder’s license<Text style={styles.titlePeriod}>.</Text></Text>
            <Text style={styles.subtitle}>Every bird in your journal is a new piece of the field.</Text>
          </View>

          <View style={styles.tabBar} accessibilityRole="tablist">
            {tabItems.map((item) => {
              const Icon = item.icon;
              const selected = item.id === activeTab;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item.id}
                  onPress={() => { setActiveTab(item.id); setError(null); }}
                  style={[styles.tabButton, selected && styles.tabButtonSelected]}
                >
                  <Icon color={selected ? colors.ink : colors.muted} size={17} />
                  <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {notice && <Text style={styles.noticeText}>{notice}</Text>}
          {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}

          {activeTab === 'license' && (
            <View style={styles.section}>
              <View style={styles.licenseCard}>
                <Animated.View
                  accessibilityElementsHidden={showReverse}
                  importantForAccessibility={showReverse ? 'no-hide-descendants' : 'auto'}
                  pointerEvents={showReverse ? 'none' : 'auto'}
                  style={[styles.licenseFace, { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Show back of birding license"
                    onPress={() => setShowReverse(true)}
                    style={styles.licenseFaceContent}
                  >
                    <View style={styles.cardContourOne} />
                    <View style={styles.cardContourTwo} />
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardWordmark}>WINGDEX</Text>
                        <Text style={styles.cardCaption}>BIRD WATCHER LICENSE</Text>
                      </View>
                      <View style={styles.issueStamp}>
                        <Text style={styles.stampText}>FIELD</Text>
                        <Text style={styles.stampText}>ISSUED</Text>
                      </View>
                    </View>
                    <View style={styles.cardRule} />
                    <View style={styles.cardIdentity}>
                      <View style={styles.cardAvatarWrap}>
                        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.cardAvatar} /> : <View style={styles.cardAvatarFallback}><Feather color="#E6D7B5" size={27} /></View>}
                      </View>
                      <View style={styles.identityCopy}>
                        <Text style={styles.cardName} numberOfLines={1}>{profile.display_name}</Text>
                        <Text style={styles.cardHandle} numberOfLines={1}>@{profile.username}</Text>
                        <View style={styles.rankLine}><Trophy color="#D8BE87" size={13} /><Text style={styles.cardRank}>{currentRank.title}</Text></View>
                      </View>
                    </View>
                    <View style={styles.cardBottom}>
                      <View style={styles.cardMeta}>
                        <Text style={styles.metaKicker}>LICENSE NUMBER</Text>
                        <Text style={styles.licenseNumber}>{profile.license_number}</Text>
                        <View style={styles.regionLine}>
                          <RegionalBadgeMark
                            variant={Math.max(0, currentRankIndex)}
                            identity={licenseBadgeIdentity}
                            regionCode={profile.home_region_code}
                            regionName={profile.home_region_name}
                            size={38}
                          />
                          <View style={styles.regionCopy}>
                            <Text style={styles.regionName}>{profile.home_region_name}</Text>
                            <Text style={styles.regionBadgeName} numberOfLines={1}>{regionIdentity?.title}</Text>
                            <Text style={styles.speciesMeta}>{speciesCount} recorded species</Text>
                          </View>
                        </View>
                        {profile.favorite_bird ? <Text style={styles.favoriteText} numberOfLines={1}>FAVORITE · {profile.favorite_bird}</Text> : null}
                      </View>
                      <View style={styles.qrCell}>
                        {publicUrl ? (
                          <QRCode value={publicUrl} size={80} backgroundColor="#FFFDF5" color="#183025" quietZone={3} />
                        ) : (
                          <View style={styles.privateQr}>
                            <QrCode color="#748078" size={28} />
                          </View>
                        )}
                        <Text style={styles.qrCaption}>{publicUrl ? 'SCAN LICENSE' : 'SET PUBLIC URL'}</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
                <Animated.View
                  accessibilityElementsHidden={!showReverse}
                  importantForAccessibility={showReverse ? 'auto' : 'no-hide-descendants'}
                  pointerEvents={showReverse ? 'auto' : 'none'}
                  style={[styles.reverseFace, { transform: [{ perspective: 1000 }, { rotateY: reverseRotation }] }]}
                >
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    style={styles.reverseScroll}
                    contentContainerStyle={styles.reverseFaceContent}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardWordmark}>WINGDEX</Text>
                        <Text style={styles.cardCaption}>LICENSE REVERSE · FIELD NOTES</Text>
                      </View>
                      <Feather color="#D8BE87" size={22} />
                    </View>
                    <View style={styles.cardRule} />
                    <Text style={styles.reverseIntro}>A life of looking closer, and the field badges earned along the way.</Text>
                    <Text style={styles.reverseSectionTitle}>REGIONAL FIELD BADGES</Text>
                    {achievements.length > 0 ? [...achievements]
                      .sort((first, second) =>
                        universalRegionalRankDefinitions.findIndex((rank) => rank.id === first.rank_code)
                        - universalRegionalRankDefinitions.findIndex((rank) => rank.id === second.rank_code))
                      .map((achievement) => {
                        const rankIndex = universalRegionalRankDefinitions.findIndex((rank) => rank.id === achievement.rank_code);
                        const rank = universalRegionalRankDefinitions[rankIndex];
                        if (!rank || rankIndex < 0) return null;
                        return (
                          <View key={achievement.rank_code} style={styles.reverseBadgeRow}>
                            <RegionalBadgeMark
                              variant={rankIndex}
                              identity={licenseBadgeIdentity}
                              regionCode={profile.home_region_code}
                              regionName={profile.home_region_name}
                              size={37}
                            />
                            <View style={styles.reverseBadgeCopy}>
                              <Text style={styles.reverseBadgeTitle}>{rank.title}</Text>
                              <Text style={styles.reverseBadgeMeta}>EARNED {new Date(achievement.unlocked_at).toLocaleDateString()}</Text>
                            </View>
                          </View>
                        );
                      })
                      : <Text style={styles.reverseBody}>Your regional badges will appear here as you reach their thresholds.</Text>}
                    <View style={styles.reverseRule} />
                    <Text style={styles.reverseSectionTitle}>TOP 3 FAVORITE BIRDS</Text>
                    {favoriteBirds.length > 0 ? favoriteBirds.map((birdName, index) => (
                      <View key={birdName} style={styles.favoriteBirdRow}>
                        <Text style={styles.favoriteBirdNumber}>0{index + 1}</Text>
                        <Text style={styles.favoriteBirdName}>{birdName}</Text>
                      </View>
                    )) : (
                      <Text style={styles.reverseBody}>Choose a favorite in your profile or save birds to your collection to feature them here.</Text>
                    )}
                    <Text style={styles.conservation}>PROTECT THE HABITAT. THE BIRDS WILL FOLLOW.</Text>
                  </ScrollView>
                </Animated.View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setShowReverse(!showReverse)} style={styles.reverseButton}>
                <Text style={styles.reverseButtonText}>{showReverse ? 'VIEW LICENSE FRONT' : 'FLIP LICENSE TO REVERSE'}</Text>
                <ArrowUpRight color={colors.inkSoft} size={15} />
              </Pressable>
              <View style={styles.licenseActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share public birding license"
                  disabled={!publicUrl || licenseAction !== null}
                  onPress={() => void shareLicense()}
                  style={({ pressed }) => [
                    styles.licenseActionButton,
                    styles.licenseActionPrimary,
                    (pressed || licenseAction !== null) && styles.licenseActionPressed,
                    (!publicUrl || licenseAction !== null) && styles.disabled,
                  ]}
                >
                  {licenseAction === 'share'
                    ? <ActivityIndicator color={colors.white} size="small" />
                    : <Share2 color={colors.white} size={16} />}
                  <Text style={styles.licenseActionPrimaryText}>Share license</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Download license as a PDF"
                  disabled={licenseAction !== null}
                  onPress={() => void downloadLicense()}
                  style={({ pressed }) => [
                    styles.licenseActionButton,
                    styles.licenseActionSecondary,
                    (pressed || licenseAction !== null) && styles.licenseActionPressed,
                    licenseAction !== null && styles.disabled,
                  ]}
                >
                  {licenseAction === 'download'
                    ? <ActivityIndicator color={colors.ink} size="small" />
                    : <Download color={colors.ink} size={16} />}
                  <Text style={styles.licenseActionSecondaryText}>Download PDF</Text>
                </Pressable>
              </View>
              <Text style={styles.licenseActionHint}>
                {publicUrl
                  ? 'Share your public license link or download both sides as a PDF.'
                  : 'Download both sides as a PDF. Public link sharing is currently unavailable.'}
              </Text>
              <View style={styles.detailRow}>
                <View>
                  <Text style={styles.detailLabel}>ISSUED</Text>
                  <Text style={styles.detailValue}>{new Date(profile.license_issued_at).toLocaleDateString()}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>HOME REGION</Text>
                  <Text style={styles.detailValue}>{profile.home_region_code}</Text>
                </View>
                <View>
                  <Text style={styles.detailLabel}>DISCOVERIES</Text>
                  <Text style={styles.detailValue}>{speciesCount}</Text>
                </View>
              </View>
              <Pressable onPress={() => setActiveTab('settings')} style={styles.sharePanel}>
                <View style={styles.shareIcon}><ShieldCheck color={colors.ink} size={18} /></View>
                <View style={styles.sharePanelCopy}>
                  <Text style={styles.sharePanelTitle}>Your license is public</Text>
                  <Text style={styles.sharePanelBody}>Your license profile is visible to anyone with its link. Email and date of birth remain private.</Text>
                </View>
                <ChevronRight color={colors.muted} size={18} />
              </Pressable>
              <Pressable onPress={() => router.push('/ranks')} style={styles.progressLink}>
                <View style={styles.progressIcon}><Trophy color={colors.ink} size={18} /></View>
                <View style={styles.progressLinkCopy}>
                  <Text style={styles.progressLinkTitle}>{currentRank.title}</Text>
                  <Text style={styles.progressLinkBody}>Explore regional rank progress and all six field badges.</Text>
                </View>
                <ChevronRight color={colors.muted} size={18} />
              </Pressable>
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Ranks & regional badges</Text>
                <Text style={styles.sectionSubtitle}>{profile.home_region_name} · {achievements.length} earned</Text>
              </View>
              {universalRegionalRankDefinitions.map((rank, index) => {
                const earned = achievements.some((achievement) => achievement.rank_code === rank.id);
                return (
                  <View key={rank.id} style={[styles.badgeRow, earned && styles.badgeRowEarned]}>
                    <View style={[styles.badgeMedallion, earned && styles.badgeMedallionEarned]}>
                      {earned ? <Check color={colors.white} size={19} /> : <Text style={styles.badgeIndex}>0{index + 1}</Text>}
                    </View>
                    <View style={styles.badgeCopy}>
                      <Text style={[styles.badgeTitle, !earned && styles.badgeTitleLocked]}>{rank.title}</Text>
                      <Text style={styles.badgeDescription}>{rank.description}</Text>
                      <Text style={styles.badgeState}>{earned ? 'EARNED · REGION BADGE' : 'LOCKED · KEEP EXPLORING'}</Text>
                    </View>
                  </View>
                );
              })}
              <Pressable onPress={() => router.push('/ranks')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Open rank progression</Text><ArrowUpRight color={colors.white} size={17} />
              </Pressable>
            </View>
          )}

          {activeTab === 'discoveries' && (
            <View style={styles.section}>
              <View style={styles.collectionSummary}>
                <View><Text style={styles.detailLabel}>SPECIES IN YOUR FIELD JOURNAL</Text><Text style={styles.collectionCount}>{speciesCount}</Text></View>
                <View><Text style={styles.detailLabel}>SAVED BIRDS</Text><Text style={styles.collectionCount}>{savedIds.length}</Text></View>
              </View>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Recent field notes</Text>
                <Text style={styles.sectionSubtitle}>{observations.length} observations · {syncing ? 'syncing' : 'on this account'}</Text>
              </View>
              {observations.length === 0 ? (
                <View style={styles.emptyDiscoveries}>
                  <Feather color={colors.muted} size={24} />
                  <Text style={styles.emptyTitle}>Your first discovery is waiting.</Text>
                  <Text style={styles.mutedBody}>Identify a bird and save it to your collection to start this list.</Text>
                </View>
              ) : observations.slice(0, 7).map((item) => (
                <View key={item.id} style={styles.discoveryRow}>
                  <View style={styles.discoveryMark}><Feather color={colors.inkSoft} size={17} /></View>
                  <View style={styles.discoveryCopy}>
                    <Text style={styles.discoveryName} numberOfLines={1}>{item.commonName ?? 'Unidentified bird'}</Text>
                    <Text style={styles.discoveryScientific} numberOfLines={1}>{item.scientificName ?? 'Field observation'}</Text>
                  </View>
                  <Text style={styles.discoveryDate}>{new Date(item.identifiedAt).toLocaleDateString()}</Text>
                </View>
              ))}
              <Pressable onPress={() => router.push('/collection')} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Open full collection</Text><ArrowUpRight color={colors.ink} size={16} />
              </Pressable>
              {syncing ? <Text style={styles.syncHint}>Your recent observations are syncing securely.</Text> : null}
              {!syncing && observations.length > 0 ? <Pressable onPress={() => void retrySync()} style={styles.syncButton}><Text style={styles.syncButtonText}>Sync field journal</Text></Pressable> : null}
            </View>
          )}

          {activeTab === 'settings' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile & privacy</Text>
              <Text style={styles.sectionSubtitle}>Your sign-in email and date of birth are private and are never included in the public license.</Text>
              <Pressable accessibilityRole="button" disabled={photoSaving} onPress={() => void changeAvatar()} style={styles.avatarPicker}>
                {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.settingsAvatar} /> : <View style={styles.settingsAvatarFallback}><ImagePlus color={colors.inkSoft} size={20} /></View>}
                <View style={styles.avatarCopy}><Text style={styles.avatarTitle}>{photoSaving ? 'Saving photo…' : 'Change profile photo'}</Text><Text style={styles.avatarSub}>Private storage · optional</Text></View>
                {photoSaving ? <ActivityIndicator color={colors.ink} /> : <ChevronRight color={colors.muted} size={17} />}
              </Pressable>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput autoCapitalize="none" autoCorrect={false} onChangeText={setEditUsername} style={styles.input} value={editUsername} />
              <Text style={styles.label}>DISPLAY NAME</Text>
              <TextInput onChangeText={setEditDisplayName} style={styles.input} value={editDisplayName} />
              <Text style={styles.label}>COUNTRY</Text>
              <TextInput onChangeText={setEditCountry} style={styles.input} value={editCountry} />
              <Text style={styles.label}>HOME REGION</Text>
              <ScrollView nestedScrollEnabled style={styles.regionChoices} contentContainerStyle={styles.regionChoicesContent}>
                {philippineRegions.map((item) => (
                  <Pressable key={item.code} onPress={() => setEditRegionCode(item.code)} style={[styles.regionChoice, item.code === editRegionCode && styles.regionChoiceSelected]}>
                    <Text style={[styles.regionChoiceText, item.code === editRegionCode && styles.regionChoiceTextSelected]}>{item.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={styles.label}>CITY OR MUNICIPALITY</Text>
              <TextInput onChangeText={setEditCity} style={styles.input} value={editCity} />
              <Text style={styles.label}>BIO</Text>
              <TextInput maxLength={240} multiline onChangeText={setEditBio} style={[styles.input, styles.bioInput]} value={editBio} />
              <Text style={styles.label}>FAVORITE BIRD</Text>
              <TextInput onChangeText={setEditFavorite} style={styles.input} value={editFavorite} />
              <Text style={styles.label}>PREFERRED HABITATS · COMMA SEPARATED</Text>
              <TextInput onChangeText={setEditCategories} style={styles.input} value={editCategories} />
              <Text style={styles.label}>BIRDING INTERESTS · COMMA SEPARATED</Text>
              <TextInput onChangeText={setEditInterests} style={styles.input} value={editInterests} />
              <Text style={styles.label}>PREFERRED DISCOVERY REGION</Text>
              <TextInput onChangeText={setEditDiscoveryRegion} style={styles.input} value={editDiscoveryRegion} />
              <Pressable disabled={saving} onPress={() => void saveEdits()} style={[styles.primaryButton, saving && styles.disabled]}>
                {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Save profile</Text>}
                {!saving && <Check color={colors.white} size={17} />}
              </Pressable>
              <View style={styles.privacySetting}>
                <ShieldCheck color={colors.ink} size={18} />
                <View style={styles.privacySettingCopy}>
                  <Text style={styles.sharePanelTitle}>PUBLIC LICENSE</Text>
                  <Text style={styles.sharePanelBody}>Anyone with your license link can see your username, display name, bio, country and city, home region and badge identity, favorite bird, habitat preferences, birding interests, discovery preference, issue date, species total, and earned badges. Email and date of birth are not public.</Text>
                </View>
              </View>
              {!publicUrl
                ? <Text style={styles.configHint}>Public link and QR are unavailable until EXPO_PUBLIC_WINGDEX_PUBLIC_URL is set to a valid public HTTPS web origin.</Text>
                : <Text accessibilityLabel="Public license URL" selectable style={styles.publicUrl}>{publicUrl}</Text>}
              <View style={styles.accountBlock}>
                <Text style={styles.label}>SIGNED IN AS</Text>
                <Text style={styles.accountEmail}>{email || 'Wingdex account'}</Text>
                <Pressable disabled={signingOut} onPress={() => void signOut()} style={styles.secondaryButton}>
                  {signingOut ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.secondaryButtonText}>Sign out</Text>}
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.footer}><View style={styles.footerRule} /><Text style={styles.footerText}>MADE FOR THE MOMENTS BETWEEN WINGS</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { flexGrow: 1, paddingHorizontal: 19, paddingTop: 12 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.inkSoft, fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 12 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1 },
  wordmark: { color: colors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.15 },
  wordmarkSub: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  toplineHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  privacyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#E8EFE5', borderWidth: 1, borderColor: '#D5E0D2' },
  privacyPillPublic: { backgroundColor: '#E8E3D0', borderColor: '#D8C99D' },
  privacyPillText: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  intro: { marginTop: 25, marginBottom: 18 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  pageTitle: { color: colors.ink, fontSize: 29, fontWeight: '800', letterSpacing: -1.2, marginTop: 6 },
  titlePeriod: { color: colors.coral },
  subtitle: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 6 },
  tabBar: { flexDirection: 'row', backgroundColor: '#ECEEE6', padding: 4, marginBottom: 14 },
  tabButton: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3, paddingHorizontal: 2 },
  tabButtonSelected: { backgroundColor: colors.white, borderBottomWidth: 2, borderBottomColor: colors.ink },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  tabLabelSelected: { color: colors.ink },
  section: { gap: 12 },
  licenseCard: { height: 320, backgroundColor: '#1C382B', overflow: 'hidden', borderWidth: 1, borderColor: '#B89D68', position: 'relative' },
  licenseFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backfaceVisibility: 'hidden' },
  licenseFaceContent: { flex: 1, padding: 15 },
  reverseFace: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#243F31', backfaceVisibility: 'hidden' },
  reverseScroll: { flex: 1 },
  reverseFaceContent: { padding: 15, paddingBottom: 18 },
  cardContourOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(230,215,181,0.10)', right: -85, top: 20 },
  cardContourTwo: { position: 'absolute', width: 205, height: 205, borderRadius: 110, borderWidth: 1, borderColor: 'rgba(230,215,181,0.10)', right: -48, top: 46 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardWordmark: { color: '#F6F0DF', fontSize: 15, fontWeight: '900', letterSpacing: 2 },
  cardCaption: { color: '#BFCDBD', fontSize: 10, fontWeight: '700', letterSpacing: 1.05, marginTop: 3 },
  issueStamp: { width: 43, height: 43, borderRadius: 22, borderWidth: 1, borderColor: '#C8AC70', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-9deg' }] },
  stampText: { color: '#D8BE87', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  cardRule: { height: 1, backgroundColor: 'rgba(229,219,192,0.30)', marginTop: 11 },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  cardAvatarWrap: { width: 52, height: 52, borderRadius: 27, borderWidth: 1, borderColor: '#D8BE87', padding: 2, overflow: 'hidden' },
  cardAvatar: { width: '100%', height: '100%', borderRadius: 24 },
  cardAvatarFallback: { width: '100%', height: '100%', borderRadius: 24, backgroundColor: '#45614F', alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, minWidth: 0 },
  cardName: { color: '#FBF7EC', fontSize: 15, fontWeight: '800' },
  cardHandle: { color: '#C7D3C8', fontSize: 10, marginTop: 2 },
  rankLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  cardRank: { color: '#E4D2A7', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 12 },
  cardMeta: { flex: 1, minWidth: 0 },
  metaKicker: { color: '#B8C6BA', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  licenseNumber: { color: '#F8F3E4', fontSize: 13, fontWeight: '800', letterSpacing: 1.1, marginTop: 3 },
  regionLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  regionCopy: { flex: 1, minWidth: 0 },
  regionName: { color: '#E5E8DC', fontSize: 10, fontWeight: '700' },
  regionBadgeName: { color: '#D9C793', fontSize: 10, fontWeight: '700', marginTop: 2 },
  speciesMeta: { color: '#B9C9BB', fontSize: 10, marginTop: 2 },
  favoriteText: { color: '#D9C793', fontSize: 10, fontWeight: '700', letterSpacing: 0.2, marginTop: 8 },
  qrCell: { alignItems: 'center', justifyContent: 'center', width: 88, minHeight: 98, padding: 4, backgroundColor: '#FFFDF5' },
  privateQr: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9EBE4' },
  qrCaption: { color: '#314237', fontSize: 10, fontWeight: '900', letterSpacing: 0.3, marginTop: 4 },
  reverseButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-end' },
  reverseButtonText: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  licenseActions: { flexDirection: 'row', gap: 8 },
  licenseActionButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  licenseActionPrimary: { backgroundColor: colors.ink },
  licenseActionSecondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  licenseActionPrimaryText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  licenseActionSecondaryText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  licenseActionPressed: { opacity: 0.8 },
  licenseActionHint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: -7 },
  reverseIntro: { color: '#D5DED3', fontSize: 11, lineHeight: 16, marginTop: 2 },
  reverseBody: { color: '#D5DED3', fontSize: 11, lineHeight: 16 },
  reverseSectionTitle: { color: '#D8BE87', fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginTop: 5 },
  reverseBadgeRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 3, borderBottomWidth: 1, borderColor: 'rgba(229,219,192,0.2)' },
  reverseBadgeCopy: { flex: 1, minWidth: 0 },
  reverseBadgeTitle: { color: '#F6F0DF', fontSize: 11, fontWeight: '800' },
  reverseBadgeMeta: { color: '#BFCDBD', fontSize: 9, fontWeight: '700', letterSpacing: 0.3, marginTop: 2 },
  reverseRule: { height: 1, backgroundColor: 'rgba(229,219,192,0.3)', marginVertical: 3 },
  favoriteBirdRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: 'rgba(229,219,192,0.2)' },
  favoriteBirdNumber: { color: '#D8BE87', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  favoriteBirdName: { flex: 1, color: '#F6F0DF', fontSize: 11, fontWeight: '700' },
  conservation: { color: '#BFCDBD', fontSize: 9, fontWeight: '900', letterSpacing: 0.7, marginTop: 7 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 13, paddingHorizontal: 3 },
  detailLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  detailValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 5 },
  sharePanel: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#EFF1E8', borderWidth: 1, borderColor: colors.line },
  shareIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leaf },
  sharePanelCopy: { flex: 1 },
  sharePanelTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  sharePanelBody: { color: colors.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  progressLink: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  progressIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E5D6' },
  progressLinkCopy: { flex: 1 },
  progressLinkTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  progressLinkBody: { color: colors.inkSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  sectionHeading: { marginBottom: 2 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  sectionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  badgeRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F3F2EA' },
  badgeRowEarned: { backgroundColor: '#E7EEE5', borderColor: '#C9D8C6' },
  badgeMedallion: { width: 42, height: 42, borderRadius: 22, borderWidth: 1, borderColor: '#C9CEC1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECEDE6' },
  badgeMedallionEarned: { backgroundColor: colors.ink, borderColor: colors.ink },
  badgeIndex: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  badgeCopy: { flex: 1 },
  badgeTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  badgeTitleLocked: { color: colors.inkSoft },
  badgeDescription: { color: colors.inkSoft, fontSize: 10, marginTop: 2 },
  badgeState: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginTop: 5 },
  primaryButton: { minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 15, backgroundColor: colors.ink, marginTop: 4 },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  secondaryButton: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, marginTop: 8 },
  secondaryButtonText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  collectionSummary: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#EAEADD' },
  collectionCount: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 3 },
  emptyDiscoveries: { alignItems: 'center', gap: 8, padding: 26, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F3F2EA' },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  mutedBody: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  discoveryRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderBottomWidth: 1, borderColor: colors.line },
  discoveryMark: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#E7EEE5', alignItems: 'center', justifyContent: 'center' },
  discoveryCopy: { flex: 1, minWidth: 0 },
  discoveryName: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  discoveryScientific: { color: colors.muted, fontSize: 10, marginTop: 2 },
  discoveryDate: { color: colors.muted, fontSize: 8, maxWidth: 70, textAlign: 'right' },
  syncHint: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 3 },
  syncButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  syncButtonText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  avatarPicker: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  settingsAvatar: { width: 43, height: 43, borderRadius: 22 },
  settingsAvatarFallback: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#E8EFE5', alignItems: 'center', justifyContent: 'center' },
  avatarCopy: { flex: 1 },
  avatarTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  avatarSub: { color: colors.muted, fontSize: 10, marginTop: 3 },
  label: { color: colors.inkSoft, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 13 },
  bioInput: { minHeight: 75, textAlignVertical: 'top' },
  regionChoices: { maxHeight: 150 },
  regionChoicesContent: { gap: 5 },
  regionChoice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 10, paddingVertical: 8 },
  regionChoiceSelected: { backgroundColor: '#E4EAE0', borderColor: colors.ink },
  regionChoiceText: { color: colors.inkSoft, fontSize: 11 },
  regionChoiceTextSelected: { color: colors.ink, fontWeight: '800' },
  privacySetting: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, marginTop: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: '#EFF1E8' },
  privacySettingCopy: { flex: 1 },
  configHint: { color: colors.inkSoft, fontSize: 10, lineHeight: 15, padding: 10, backgroundColor: '#E9E5D6' },
  publicUrl: { color: colors.inkSoft, fontSize: 10, lineHeight: 15 },
  accountBlock: { borderTopWidth: 1, borderColor: colors.line, marginTop: 12, paddingTop: 10 },
  accountEmail: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 5 },
  noticeText: { color: colors.inkSoft, fontSize: 11, backgroundColor: '#E8EFE5', padding: 10, marginBottom: 9 },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 16, backgroundColor: colors.coralPale, padding: 10, marginBottom: 9 },
  disabled: { opacity: 0.55 },
  footer: { alignItems: 'center', paddingTop: 27, paddingBottom: 8 },
  footerRule: { height: 1, width: 46, backgroundColor: colors.leafDeep, marginBottom: 11 },
  footerText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
});
