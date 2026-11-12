import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Feather, Leaf, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getPublicBirdingLicense, type PublicBirdingLicense } from '../../src/services/birdingLicense';
import { regionalBadgeIdentities } from '../../src/data/philippineRegions';
import { universalRegionalRankDefinitions } from '../../src/services/regionalRanks';
import { colors } from '../../src/theme';
import { RegionalBadgeMark } from '../../src/components/RegionalBadgeMark';

export default function PublicLicenseScreen() {
  const { licenseNumber } = useLocalSearchParams<{ licenseNumber: string }>();
  const normalizedLicenseNumber = typeof licenseNumber === 'string' ? licenseNumber : '';
  const [profile, setProfile] = useState<PublicBirdingLicense | null>(null);
  const [loading, setLoading] = useState(Boolean(normalizedLicenseNumber));
  const publicRegionCode = profile?.home_region_code ?? null;
  const publicRegionIdentity = publicRegionCode ? regionalBadgeIdentities[publicRegionCode] : regionalBadgeIdentities.NCR;
  const publicBadgeVariant = profile?.earned_badges.reduce((highest, badge) =>
    Math.max(highest, universalRegionalRankDefinitions.findIndex((rank) => rank.id === badge.rank_code)), 0) ?? 0;

  useEffect(() => {
    let active = true;
    if (!normalizedLicenseNumber) return () => { active = false; };
    getPublicBirdingLicense(normalizedLicenseNumber).then((result) => {
      if (active) setProfile(result);
    }).catch(() => {
      if (active) setProfile(null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [normalizedLicenseNumber]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={colors.inkSoft} size={16} /><Text style={styles.backText}>Wingdex</Text>
          </Pressable>
          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.ink} size="large" /><Text style={styles.bodyText}>Checking public license…</Text></View>
          ) : !profile ? (
            <View style={styles.unavailable}>
              <View style={styles.brandMark}><LockKeyhole color={colors.paper} size={18} /></View>
              <Text style={styles.eyebrow}>LICENSE NOT AVAILABLE</Text>
              <Text style={styles.title}>This field record is private.</Text>
              <Text style={styles.bodyText}>The license may not exist, or its owner may have turned sharing off.</Text>
            </View>
          ) : (
            <>
              <View style={styles.brandLine}>
                <View style={styles.brandMark}><Leaf color={colors.paper} size={18} /></View>
                <Text style={styles.wordmark}>WINGDEX <Text style={styles.wordmarkSub}>PUBLIC LICENSE</Text></Text>
              </View>
              <Text style={styles.eyebrow}>BIRD WATCHER LICENSE</Text>
              <View style={styles.licenseCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardWordmark}>WINGDEX</Text>
                    <Text style={styles.cardCaption}>A FIELD RECORD OF THE WILD</Text>
                  </View>
                  <View style={styles.verified}><ShieldCheck color="#D8BE87" size={16} /><Text style={styles.verifiedText}>PUBLIC</Text></View>
                </View>
                <View style={styles.rule} />
                <View style={styles.identity}>
                  <View style={styles.avatar}><Feather color="#E6D7B5" size={25} /></View>
                  <View style={styles.identityCopy}>
                    <Text style={styles.name}>{profile.display_name}</Text>
                    <Text style={styles.handle}>@{profile.username}</Text>
                    <Text style={styles.licenseNumber}>{profile.license_number}</Text>
                  </View>
                </View>
                <View style={styles.bottom}>
                  <View style={styles.bottomCopy}>
                    <Text style={styles.region}>{profile.home_region_name ?? profile.country}</Text>
                    {profile.home_region_code ? <Text style={styles.regionIdentity}>{regionalBadgeIdentities[profile.home_region_code].title}</Text> : null}
                    {profile.city ? <Text style={styles.city}>{profile.city}</Text> : null}
                    <Text style={styles.species}>{profile.species_count} recorded species</Text>
                    {profile.favorite_bird ? <Text style={styles.favorite}>FAVORITE · {profile.favorite_bird}</Text> : null}
                  </View>
                  <RegionalBadgeMark
                    variant={publicBadgeVariant}
                    identity={publicRegionIdentity}
                    regionCode={publicRegionCode}
                    regionName={profile.home_region_name ?? profile.country}
                    size={48}
                  />
                </View>
              </View>
              {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Regional field badges</Text>
                <Text style={styles.sectionSubtitle}>{profile.home_region_name ?? 'Home region'} · issued {new Date(profile.license_issued_at).toLocaleDateString()}</Text>
                {profile.earned_badges.length
                  ? profile.earned_badges.map((badge) => (
                    <View key={badge.rank_code} style={styles.badgeRow}>
                      <RegionalBadgeMark
                        variant={Math.max(0, universalRegionalRankDefinitions.findIndex((rank) => rank.id === badge.rank_code))}
                        identity={publicRegionIdentity}
                        regionCode={publicRegionCode}
                        regionName={profile.home_region_name ?? profile.country}
                        size={42}
                      />
                      <View style={styles.badgeCopy}><Text style={styles.badgeTitle}>{badge.rank_title}</Text><Text style={styles.badgeDate}>EARNED {new Date(badge.unlocked_at).toLocaleDateString()}</Text></View>
                    </View>
                  ))
                  : <Text style={styles.bodyText}>No regional rank badges have been earned yet.</Text>}
                <Text style={styles.subhead}>SPECIAL ACHIEVEMENTS</Text>
                <Text style={styles.bodyText}>No special achievements have been recorded for this license yet. Wingdex currently tracks regional rank badges only.</Text>
                {profile.preferred_categories.length ? (
                  <>
                    <Text style={styles.subhead}>FAVORITE HABITATS</Text>
                    <Text style={styles.bodyText}>{profile.preferred_categories.join(' · ')}</Text>
                  </>
                ) : null}
                {profile.interests.length ? (
                  <>
                    <Text style={styles.subhead}>BIRDING INTERESTS</Text>
                    <Text style={styles.bodyText}>{profile.interests.join(' · ')}</Text>
                  </>
                ) : null}
              </View>
              <View style={styles.conservation}><Text style={styles.conservationText}>OBSERVE WITH CARE. PROTECT THE HABITAT.</Text></View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { flexGrow: 1, padding: 21 },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, marginBottom: 17 },
  backText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 30 },
  brandMark: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.15 },
  wordmarkSub: { color: colors.muted, fontSize: 10, letterSpacing: 0.8 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 11 },
  licenseCard: { padding: 18, backgroundColor: '#1C382B', borderWidth: 1, borderColor: '#B89D68' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardWordmark: { color: '#F6F0DF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  cardCaption: { color: '#BFCDBD', fontSize: 10, fontWeight: '700', letterSpacing: 0.9, marginTop: 3 },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#7C765D', paddingHorizontal: 8, paddingVertical: 6 },
  verifiedText: { color: '#E1D2AA', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  rule: { height: 1, backgroundColor: 'rgba(229,219,192,0.3)', marginTop: 15 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15 },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: '#D8BE87', alignItems: 'center', justifyContent: 'center', backgroundColor: '#45614F' },
  identityCopy: { flex: 1 },
  name: { color: '#FBF7EC', fontSize: 19, fontWeight: '800' },
  handle: { color: '#C7D3C8', fontSize: 11, marginTop: 2 },
  licenseNumber: { color: '#E1D2AA', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 7 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 18 },
  bottomCopy: { flex: 1 },
  region: { color: '#E5E8DC', fontSize: 12, fontWeight: '800' },
  regionIdentity: { color: '#D9C793', fontSize: 10, fontWeight: '700', marginTop: 3 },
  city: { color: '#B9C9BB', fontSize: 10, marginTop: 3 },
  species: { color: '#B9C9BB', fontSize: 10, marginTop: 8 },
  favorite: { color: '#D9C793', fontSize: 10, fontWeight: '700', marginTop: 7, letterSpacing: 0.2 },
  bio: { color: colors.inkSoft, fontSize: 13, lineHeight: 20, marginVertical: 18 },
  section: { padding: 16, backgroundColor: '#F1F0E8', borderWidth: 1, borderColor: colors.line, marginTop: 17, gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  badgeRow: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 9 },
  badgeCopy: { flex: 1 },
  badgeTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  badgeDate: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, marginTop: 3 },
  subhead: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 8 },
  bodyText: { color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  conservation: { paddingVertical: 20, alignItems: 'center' },
  conservationText: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 0.9, textAlign: 'center' },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: 12 },
  unavailable: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', paddingTop: 60 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: 8 },
});
