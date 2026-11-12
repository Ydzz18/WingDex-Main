import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowRight,
  Bird,
  Check,
  Feather,
  LockKeyhole,
  Shield,
  Sparkles,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { birds } from '../../src/data/birds';
import { worldBirds } from '../../src/data/world-birds';
import { PageHeader } from '../../src/components/PageHeader';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import type { BirdObservation } from '../../src/services/collection';
import { getPublishedBadges, getPublishedRanks, type AppBadge, type AppRank } from '../../src/services/adminContent';
import { colors } from '../../src/theme';

const knownSpecies = new Map<string, string>();
for (const bird of [...birds, ...worldBirds]) {
  const species = bird.scientificName.trim().toLocaleLowerCase();
  knownSpecies.set(species, species);
  knownSpecies.set(bird.name.trim().toLocaleLowerCase(), species);
}

function speciesKey(observation: BirdObservation) {
  const scientificName = observation.scientificName?.trim().toLocaleLowerCase() ?? '';
  const commonName = observation.commonName?.trim().toLocaleLowerCase() ?? '';
  return knownSpecies.get(scientificName) ?? knownSpecies.get(commonName) ?? (scientificName || commonName);
}

const milestones = [
  { threshold: 1, title: 'First feather', detail: 'Identify your first species' },
  { threshold: 5, title: 'Curious birder', detail: 'Identify 5 unique species' },
  { threshold: 25, title: 'Field naturalist', detail: 'Identify 25 unique species' },
];

const progressTiers = [
  { threshold: 1, title: 'First feather' },
  { threshold: 5, title: 'Curious birder' },
  { threshold: 25, title: 'Field naturalist' },
  { threshold: 50, title: 'Seasoned observer' },
  { threshold: 100, title: 'Dedicated naturalist' },
  { threshold: 250, title: 'Lifelong birder' },
  { threshold: 500, title: 'Living field library' },
  { threshold: 1000, title: 'A thousand-wing life list' },
];

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function RanksScreen() {
  const { observations, savedIds, storageError, syncError, syncing, retrySync } = useSavedBirds();
  const [publishedBadges, setPublishedBadges] = useState<AppBadge[]>([]);
  const [publishedRanks, setPublishedRanks] = useState<AppRank[]>([]);
  const [contentError, setContentError] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getPublishedBadges(), getPublishedRanks()])
      .then(([badges, ranks]) => {
        if (!active) return;
        setPublishedBadges(badges);
        setPublishedRanks(ranks);
        setContentLoaded(true);
        setContentError(false);
      })
      .catch(() => {
        if (active) setContentError(true);
      });
    return () => { active = false; };
  }, []));
  const identifiedSpecies = useMemo(() => {
    const result = new Set<string>();
    observations.forEach((observation) => {
      if (observation.commonName || observation.scientificName) {
        result.add(speciesKey(observation));
      }
    });
    return result;
  }, [observations]);

  const speciesCount = identifiedSpecies.size;
  const visibleRanks = contentLoaded ? publishedRanks : progressTiers;
  const currentTier = [...visibleRanks].reverse().find((tier) => speciesCount >= tier.threshold);
  const nextTier = visibleRanks.find((tier) => speciesCount < tier.threshold)
    ?? (!contentLoaded ? {
      threshold: Math.ceil((speciesCount + 1) / 100) * 100,
      title: 'Field record milestone',
    } : null);
  const previousThreshold = currentTier?.threshold ?? 0;
  const progress = nextTier ? Math.max(
    0,
    Math.min(1, (speciesCount - previousThreshold) / (nextTier.threshold - previousThreshold))
  ) : 1;
  const remaining = nextTier ? Math.max(0, nextTier.threshold - speciesCount) : 0;
  const visibleBadges = contentLoaded ? publishedBadges : milestones.map((milestone) => ({
    id: String(milestone.threshold),
    title: milestone.title,
    description: milestone.detail,
    threshold: milestone.threshold,
    rule_type: 'unique_species' as const,
  }));
  const earnedBadges = visibleBadges.filter((badge) => (
    badge.rule_type === 'observations'
      ? observations.length >= badge.threshold
      : badge.rule_type === 'saved_species'
        ? savedIds.length >= badge.threshold
        : speciesCount >= badge.threshold
  )).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <PageHeader
            title="A little higher"
            eyebrow="YOUR WINGDEX JOURNEY"
            subtitle="Every new bird brings your field record to life."
            accessory={
              <View style={styles.headerMark} accessibilityElementsHidden>
                <Feather color={colors.ink} size={22} />
              </View>
            }
          />

          <View style={styles.progressCard}>
            <View style={styles.cardTopline}>
              <View style={styles.shieldMark}>
                <Shield color="#E8F0E6" size={26} strokeWidth={1.7} />
                <Feather color="#E8F0E6" size={12} style={styles.shieldFeather} />
              </View>
              <View style={styles.cardHeading}>
                <Text style={styles.cardEyebrow}>PERSONAL FIELD PROGRESS</Text>
                <Text style={styles.tierTitle}>
                  {currentTier?.title ?? (contentLoaded ? 'No published rank' : 'A field journal begins')}
                </Text>
              </View>
              <Sparkles color={colors.yellow} size={19} />
            </View>

            <View style={styles.speciesCount}>
              <Text style={styles.countValue}>{speciesCount}</Text>
              <View style={styles.countCopy}>
                <Text style={styles.countLabel}>unique species</Text>
                <Text style={styles.countCaption}>identified in your collection</Text>
              </View>
            </View>

            {nextTier && <View
              style={styles.progressTrack}
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={nextTier ? `Progress to ${nextTier.title}` : 'No published ranks'}
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
            >
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>}
            {nextTier ? (
              <View style={styles.progressFooter}>
                <Text style={styles.progressLabel}>{formatCount(speciesCount, 'species', 'species')} so far</Text>
                <Text style={styles.progressLabel}>{formatCount(remaining, 'more species', 'more species')} to {nextTier.title}</Text>
              </View>
            ) : <Text style={styles.noContentLabel}>No ranks are published right now.</Text>}
            <Text style={styles.privateLabel}>YOUR COLLECTION · PROGRESS FROM FIELD NOTES</Text>
          </View>

          {storageError && (
            <View style={styles.errorNotice} accessibilityRole="alert">
              <Text style={styles.errorTitle}>Your field record couldn’t be loaded</Text>
              <Text style={styles.errorText}>
                Local collection storage had a problem. Open your collection to try again.
              </Text>
              <Pressable
                onPress={() => router.push('/collection')}
                style={({ pressed }) => [styles.errorAction, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.errorActionText}>Open collection</Text>
                <ArrowRight color={colors.danger} size={15} />
              </Pressable>
            </View>
          )}

          {syncError && (
            <View style={styles.errorNotice} accessibilityRole="alert">
              <Text style={styles.errorTitle}>Cloud sync needs another try</Text>
              <Text style={styles.errorText}>Your collection is still saved on this device.</Text>
              <Pressable
                onPress={() => void retrySync()}
                disabled={syncing}
                style={({ pressed }) => [styles.errorAction, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.errorActionText}>{syncing ? 'Syncing…' : 'Retry sync'}</Text>
                <ArrowRight color={colors.danger} size={15} />
              </Pressable>
            </View>
          )}

          {contentError && (
            <Text style={styles.contentNotice} accessibilityRole="alert">
              Published badges and ranks couldn’t be refreshed. Your field record remains available.
            </Text>
          )}

          <View style={styles.recordSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Your field record</Text>
                <Text style={styles.sectionSubtitle}>A little more of the world, one note at a time.</Text>
              </View>
              <Pressable
                onPress={() => router.push('/collection')}
                style={({ pressed }) => [styles.textLink, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="View your collection"
              >
                <Text style={styles.textLinkLabel}>Collection</Text>
                <ArrowRight color={colors.inkSoft} size={15} />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.stat, styles.statPrimary]}>
                <Bird color={colors.inkSoft} size={19} />
                <Text style={styles.statValue}>{speciesCount}</Text>
                <Text style={styles.statLabel}>UNIQUE SPECIES</Text>
              </View>
              <View style={styles.stat}>
                <Feather color={colors.muted} size={18} />
                <Text style={styles.statValue}>{observations.length}</Text>
                <Text style={styles.statLabel}>FIELD NOTES</Text>
              </View>
              <View style={styles.stat}>
                <Shield color={colors.muted} size={18} />
                <Text style={styles.statValue}>{savedIds.length}</Text>
                <Text style={styles.statLabel}>SAVED BIRDS</Text>
              </View>
            </View>
          </View>

          {speciesCount === 0 && (
            <View style={styles.emptyCard}>
              <View style={styles.emptyMark}>
                <Bird color={colors.inkSoft} size={21} />
              </View>
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>
                  {observations.length > 0 ? 'Your first identified species is still ahead' : 'Your first field note is waiting'}
                </Text>
                <Text style={styles.emptyText}>
                  {observations.length > 0
                    ? 'Unidentified notes stay in your collection, but only identified species count toward milestones.'
                    : 'Start with a bird you know. Each identified species adds a new mark to your private field record.'}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/collection')}
                style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.emptyActionLabel}>Visit collection</Text>
                <ArrowRight color={colors.ink} size={16} />
              </Pressable>
            </View>
          )}

          <View style={styles.achievementSection}>
            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Earned in the field</Text>
                <Text style={styles.sectionSubtitle}>Personal collection milestones</Text>
              </View>
              <Text style={styles.earnedCount}>
                {earnedBadges} / {visibleBadges.length}
              </Text>
            </View>

            <View style={styles.badges}>
              {visibleBadges.map((milestone) => {
                const earned = milestone.rule_type === 'observations'
                  ? observations.length >= milestone.threshold
                  : milestone.rule_type === 'saved_species'
                    ? savedIds.length >= milestone.threshold
                    : speciesCount >= milestone.threshold;
                return (
                  <View
                    key={milestone.id}
                    style={[styles.badgeCard, earned && styles.badgeCardEarned]}
                  >
                    <View style={[styles.badgeMark, earned && styles.badgeMarkEarned]}>
                      {earned
                        ? <Check color={colors.ink} size={17} strokeWidth={2.5} />
                        : <LockKeyhole color={colors.muted} size={16} />}
                    </View>
                    <Text style={styles.badgeTitle}>{milestone.title}</Text>
                    <Text style={styles.badgeDetail}>{milestone.description}</Text>
                    <Text style={[styles.badgeState, earned && styles.badgeStateEarned]}>
                      {earned ? 'ADDED TO YOUR RECORD' : `${milestone.threshold} SPECIES`}
                    </Text>
                  </View>
                );
              })}
              {visibleBadges.length === 0 && (
                <Text style={styles.noContentLabel}>No badges are published right now.</Text>
              )}
            </View>
          </View>

          {nextTier && (
            <View style={styles.nextCard}>
              <View style={styles.nextIcon}>
                <Feather color={colors.ink} size={20} />
              </View>
              <View style={styles.nextCopy}>
                <Text style={styles.nextEyebrow}>NEXT FIELD MILESTONE</Text>
                <Text style={styles.nextTitle}>{nextTier.title}</Text>
                <Text style={styles.nextDetail}>
                  {formatCount(remaining, 'more identified species', 'more identified species')} to reach {nextTier.threshold}.
                </Text>
              </View>
              <View style={styles.nextCount}>
                <Text style={styles.nextCountValue}>{speciesCount}</Text>
                <View style={styles.nextCountDivider} />
                <Text style={styles.nextCountTarget}>{nextTier.threshold}</Text>
              </View>
            </View>
          )}

          <Text style={styles.privacyNote}>
            Progress is calculated from your collection. Published badge and rank definitions come from Wingdex.
          </Text>
        </View>
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
  page: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  headerMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 19,
    paddingBottom: 16,
    marginBottom: 25,
    overflow: 'hidden',
  },
  cardTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldMark: {
    width: 48,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shieldFeather: {
    position: 'absolute',
    top: 17,
  },
  cardHeading: {
    flex: 1,
  },
  cardEyebrow: {
    color: '#C5D4C8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  tierTitle: {
    color: colors.white,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  speciesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },
  countValue: {
    color: colors.white,
    fontSize: 50,
    lineHeight: 55,
    fontWeight: '700',
    letterSpacing: -1.5,
    marginRight: 13,
  },
  countCopy: {
    paddingTop: 7,
  },
  countLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  countCaption: {
    color: '#C5D4C8',
    fontSize: 11,
    marginTop: 3,
  },
  progressTrack: {
    height: 8,
    borderRadius: 5,
    backgroundColor: '#496157',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.leafDeep,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 9,
  },
  progressLabel: {
    color: '#E6ECE5',
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  privateLabel: {
    color: '#B9CBBE',
    fontSize: 8,
    letterSpacing: 1.1,
    fontWeight: '700',
    marginTop: 17,
  },
  errorNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6B9AD',
    backgroundColor: '#FFF4F0',
    padding: 15,
    marginTop: -8,
    marginBottom: 20,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    color: colors.inkSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  errorAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 3,
  },
  errorActionText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  contentNotice: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 18,
  },
  noContentLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    paddingVertical: 8,
  },
  recordSection: {
    marginBottom: 22,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
    gap: 8,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  textLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingLeft: 6,
  },
  textLinkLabel: {
    color: colors.inkSoft,
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  stat: {
    flex: 1,
    minHeight: 101,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E7E8E0',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingTop: 12,
    paddingBottom: 10,
  },
  statPrimary: {
    backgroundColor: '#EEF2E9',
    borderColor: '#DCE4D8',
  },
  statValue: {
    color: colors.ink,
    fontSize: 23,
    lineHeight: 27,
    fontWeight: '700',
    marginTop: 3,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.65,
    marginTop: 3,
  },
  emptyCard: {
    backgroundColor: '#EFF3EA',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  emptyMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCE7D7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  emptyCopy: {
    flex: 1,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.inkSoft,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 10,
    paddingVertical: 3,
  },
  emptyActionLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  achievementSection: {
    marginBottom: 20,
  },
  earnedCount: {
    color: colors.inkSoft,
    backgroundColor: '#E9EEE5',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  badgeCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 141,
    backgroundColor: colors.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7E8E0',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  badgeCardEarned: {
    backgroundColor: '#FCFDF9',
    borderColor: '#D7E1D3',
  },
  badgeMark: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#F0F1EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  badgeMarkEarned: {
    backgroundColor: '#DCE9D7',
  },
  badgeTitle: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  badgeDetail: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
    flex: 1,
  },
  badgeState: {
    color: colors.muted,
    fontSize: 7,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.45,
    marginTop: 9,
  },
  badgeStateEarned: {
    color: colors.inkSoft,
  },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF0E5',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
  },
  nextIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#D8E4D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  nextCopy: {
    flex: 1,
    minWidth: 0,
  },
  nextEyebrow: {
    color: colors.inkSoft,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  nextTitle: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  nextDetail: {
    color: colors.inkSoft,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  nextCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  nextCountValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  nextCountDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#B8C7B3',
    marginHorizontal: 6,
  },
  nextCountTarget: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  privacyNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
