import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Check, ImagePlus, Leaf, LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLicenseAccessState,
  getSelfReportedAge,
  submitPrivateBirthDate,
  saveBirdingLicenseProfile,
  uploadProfilePhoto,
  type AgeStatus,
} from '../src/services/birdingLicense';
import { findPhilippineRegion, philippineRegions, type PhilippineRegionCode } from '../src/data/philippineRegions';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme';

type Step = 1 | 2 | 3;
const categories = ['Forest', 'Wetlands', 'Coastal', 'Urban', 'Mountains', 'Grassland'];
const interests = ['Conservation', 'Bird photography', 'Migration', 'Endemic species', 'Bird calls'];

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(1);
  const [ageStatus, setAgeStatus] = useState<AgeStatus>('missing');
  const [birthDate, setBirthDate] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('Philippines');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [regionCode, setRegionCode] = useState<PhilippineRegionCode>('NCR');
  const [favoriteBird, setFavoriteBird] = useState('');
  const [preferredRegion, setPreferredRegion] = useState('National Capital Region');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [ageStateLoading, setAgeStateLoading] = useState(true);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const region = useMemo(() => findPhilippineRegion(regionCode), [regionCode]);

  useEffect(() => {
    let active = true;
    Promise.all([getLicenseAccessState(), supabase?.auth.getUser()]).then(([access, userResponse]) => {
      if (!active) return;
      setAgeStatus(access.age_status);
      if (access.is_adult) {
        setStep(access.profile_complete ? 3 : 2);
        const metadata = userResponse?.data.user?.user_metadata;
        if (typeof metadata?.username === 'string') setUsername(metadata.username);
        if (typeof metadata?.full_name === 'string') setDisplayName(metadata.full_name);
        else if (typeof metadata?.name === 'string') setDisplayName(metadata.name);
      }
      setAgeStateLoading(false);
    }).catch(() => {
      if (!active) return;
      setAgeStateLoading(false);
      setError('We could not verify your account. Reconnect and try again before continuing.');
    });
    return () => { active = false; };
  }, []);

  const continueFromAge = async () => {
    setError(null);
    const age = getSelfReportedAge(birthDate.trim());
    if (age === null) {
      setError('Enter your date of birth in YYYY-MM-DD format.');
      return;
    }
    if (age < 13) {
      try {
        setAgeStatus(await submitPrivateBirthDate(birthDate.trim()));
        setError('You must be at least 13 to use Wingdex. Your date of birth stays private.');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Your age could not be checked.');
      }
      return;
    }
    if (age < 18) {
      try {
        setAgeStatus(await submitPrivateBirthDate(birthDate.trim()));
        setError('We can’t admit 13–17-year-olds until a real guardian-consent provider is configured. A checkbox or email link cannot verify consent.');
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Your age could not be checked.');
      }
      return;
    }
    try {
      setSubmitting(true);
      const status = await submitPrivateBirthDate(birthDate.trim());
      setAgeStatus(status);
      if (status !== 'adult') {
        setError(status === 'under_13'
          ? 'You must be at least 13 to use Wingdex.'
          : 'Wingdex cannot admit people under 18 until a guardian-consent provider is configured.');
        return;
      }
      setStep(2);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your age could not be checked.');
    } finally {
      setSubmitting(false);
    }
  };

  const chooseAvatar = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to choose a profile image.');
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (selection.canceled || !selection.assets[0]) return;
    setPhotoSaving(true);
    try {
      const signedUrl = await uploadProfilePhoto(selection.assets[0].uri);
      setAvatarUri(signedUrl);
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Your photo could not be uploaded.');
    } finally {
      setPhotoSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!region) return;
    setError(null);
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      setError('Username must be 3–24 letters, numbers, or underscores.');
      setStep(2);
      return;
    }
    if (!displayName.trim()) {
      setError('Add the name you’d like to show on your license.');
      setStep(2);
      return;
    }
    setSubmitting(true);
    try {
      await saveBirdingLicenseProfile({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        country: country.trim() || 'Philippines',
        city: city.trim(),
        bio: bio.trim(),
        homeRegionCode: region.code,
        homeRegionName: region.name,
        favoriteBird: favoriteBird.trim(),
        preferredCategories: selectedCategories,
        interests: selectedInterests,
        preferredDiscoveryRegion: preferredRegion,
      });
      router.replace('/(tabs)/user_profile');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your license could not be issued. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleItem = (items: string[], setItems: (value: string[]) => void, value: string) => {
    setItems(items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
  };

  const stepTitle = step === 1 ? 'A private age check' : step === 2 ? 'Your field identity' : 'Your birding life';

  if (ageStateLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ink} size="large" />
          <Text style={styles.bodyText}>Checking your private account status…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (ageStatus === 'under_13' || ageStatus === 'minor_provider_required') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.blockedWrap}>
          <View style={styles.brandMark}><Leaf color={colors.paper} size={19} /></View>
          <Text style={styles.eyebrow}>WINGDEX ACCOUNT ACCESS</Text>
          <Text style={styles.title}>{ageStatus === 'under_13' ? 'Not quite yet.' : 'A guardian check is needed.'}</Text>
          <Text style={styles.bodyText}>
            {ageStatus === 'under_13'
              ? 'Wingdex accounts are for people aged 13 and older. Your birth date is not stored for under-13 accounts.'
              : 'Wingdex does not yet have a guardian-consent provider. People aged 13–17 cannot enter until a real provider is configured and consent is verified. We will not treat an email link or checkbox as proof.'}
          </Text>
          <View style={styles.providerNotice}>
            <LockKeyhole color={colors.inkSoft} size={18} />
            <Text style={styles.providerNoticeText}>No date of birth is shown on your license or public profile.</Text>
          </View>
          <Pressable onPress={() => void supabase?.auth.signOut()} style={styles.outButton}>
            <Text style={styles.outButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.topline}>
              <View style={styles.brandMark}><Leaf color={colors.paper} size={19} /></View>
              <Text style={styles.wordmark}>WINGDEX <Text style={styles.wordmarkSub}>FIELD LICENSE</Text></Text>
            </View>
            <Text style={styles.eyebrow}>YOUR BIRD WATCHER LICENSE</Text>
            <Text style={styles.title}>{stepTitle}<Text style={styles.titlePeriod}>.</Text></Text>
            <Text style={styles.bodyText}>
              {step === 1
                ? 'Before your field journal opens, we check your self-reported age privately. No identity or guardian-verification provider is configured; your date of birth is never placed in sign-in metadata or your public license.'
                : step === 2
                  ? 'Choose the identity and home region you want on your personal field credential.'
                  : 'Tell us what you love to find. Your issued license is public; your email and date of birth stay private.'}
            </Text>

            <View style={styles.stepper} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step }}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.stepItem}>
                  <View style={[styles.stepDot, step >= item && styles.stepDotActive]}>
                    {step > item ? <Check size={14} color={colors.white} /> : <Text style={[styles.stepNumber, step >= item && styles.stepNumberActive]}>{item}</Text>}
                  </View>
                  <Text style={[styles.stepLabel, step === item && styles.stepLabelActive]}>
                    {item === 1 ? 'Age' : item === 2 ? 'Identity' : 'Preferences'}
                  </Text>
                </View>
              ))}
            </View>

            {step === 1 && (
              <View style={styles.formPanel}>
                <Text style={styles.label}>DATE OF BIRTH</Text>
                <TextInput
                  accessibilityLabel="Date of birth"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={setBirthDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={birthDate}
                />
                <View style={styles.privacyNote}>
                  <ShieldCheck color={colors.inkSoft} size={18} />
                  <Text style={styles.privacyText}>Adults may continue. Under-13 users are rejected. Ages 13–17 are blocked until a real guardian-consent provider is configured.</Text>
                </View>
                {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
                <Pressable disabled={submitting} onPress={() => void continueFromAge()} style={[styles.primaryButton, submitting && styles.disabled]}>
                  {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Continue as an adult</Text>}
                  {!submitting && <ArrowRight color={colors.white} size={18} />}
                </Pressable>
              </View>
            )}

            {step === 2 && (
              <View style={styles.formPanel}>
                <Pressable accessibilityRole="button" disabled={photoSaving} onPress={() => void chooseAvatar()} style={styles.avatarPicker}>
                  {avatarUri
                    ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                    : <View style={styles.avatarFallback}><ImagePlus size={22} color={colors.inkSoft} /></View>}
                  <View style={styles.avatarCopy}>
                    <Text style={styles.avatarTitle}>{photoSaving ? 'Saving your photo…' : 'Choose a profile photo'}</Text>
                    <Text style={styles.avatarSub}>Optional · stored privately</Text>
                  </View>
                  {photoSaving && <ActivityIndicator color={colors.ink} />}
                </Pressable>
                <Text style={styles.label}>USERNAME</Text>
                <TextInput accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} onChangeText={setUsername} placeholder="field_birder" placeholderTextColor={colors.muted} style={styles.input} value={username} />
                <Text style={styles.label}>DISPLAY NAME</Text>
                <TextInput accessibilityLabel="Display name" onChangeText={setDisplayName} placeholder="The name on your license" placeholderTextColor={colors.muted} style={styles.input} value={displayName} />
                <Text style={styles.label}>COUNTRY</Text>
                <TextInput accessibilityLabel="Country" onChangeText={setCountry} placeholder="Philippines" placeholderTextColor={colors.muted} style={styles.input} value={country} />
                <Text style={styles.label}>PHILIPPINE HOME REGION</Text>
                <ScrollView nestedScrollEnabled style={styles.regionList} contentContainerStyle={styles.regionListContent}>
                  {philippineRegions.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: item.code === regionCode }}
                      key={item.code}
                      onPress={() => setRegionCode(item.code)}
                      style={[styles.regionOption, item.code === regionCode && styles.regionOptionActive]}
                    >
                      <Text style={[styles.regionText, item.code === regionCode && styles.regionTextActive]}>{item.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.label}>CITY OR MUNICIPALITY · OPTIONAL</Text>
                <TextInput accessibilityLabel="City or municipality" onChangeText={setCity} placeholder="Where you usually bird" placeholderTextColor={colors.muted} style={styles.input} value={city} />
                <Text style={styles.label}>SHORT BIO · OPTIONAL</Text>
                <TextInput accessibilityLabel="Short bio" maxLength={240} multiline onChangeText={setBio} placeholder="A line about your time in the field…" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} value={bio} />
                {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
                <View style={styles.buttonRow}>
                  <Pressable onPress={() => setStep(1)} style={styles.backButton}><ArrowLeft color={colors.inkSoft} size={17} /><Text style={styles.backText}>Back</Text></Pressable>
                  <Pressable onPress={() => { setError(null); setStep(3); }} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Birding preferences</Text><ArrowRight color={colors.white} size={18} /></Pressable>
                </View>
              </View>
            )}

            {step === 3 && (
              <View style={styles.formPanel}>
                <Text style={styles.label}>FAVORITE BIRD · OPTIONAL</Text>
                <TextInput accessibilityLabel="Favorite bird" onChangeText={setFavoriteBird} placeholder="Search or type a species name" placeholderTextColor={colors.muted} style={styles.input} value={favoriteBird} />
                <Text style={styles.label}>HABITATS YOU ENJOY</Text>
                <View style={styles.chipRow}>
                  {categories.map((item) => (
                    <Pressable key={item} onPress={() => toggleItem(selectedCategories, setSelectedCategories, item)} style={[styles.chip, selectedCategories.includes(item) && styles.chipSelected]}>
                      <Text style={[styles.chipText, selectedCategories.includes(item) && styles.chipTextSelected]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>BIRDING INTERESTS</Text>
                <View style={styles.chipRow}>
                  {interests.map((item) => (
                    <Pressable key={item} onPress={() => toggleItem(selectedInterests, setSelectedInterests, item)} style={[styles.chip, selectedInterests.includes(item) && styles.chipSelected]}>
                      <Text style={[styles.chipText, selectedInterests.includes(item) && styles.chipTextSelected]}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>PREFERRED DISCOVERY REGION</Text>
                <ScrollView nestedScrollEnabled style={styles.regionList} contentContainerStyle={styles.regionListContent}>
                  {philippineRegions.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: item.name === preferredRegion }}
                      key={item.code}
                      onPress={() => setPreferredRegion(item.name)}
                      style={[styles.regionOption, item.name === preferredRegion && styles.regionOptionActive]}
                    >
                      <Text style={[styles.regionText, item.name === preferredRegion && styles.regionTextActive]}>{item.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.publicDisclosure}>
                  <ShieldCheck color={colors.ink} size={19} />
                  <View style={styles.disclosureCopy}>
                    <Text style={styles.shareTitle}>Your license will be public</Text>
                    <Text style={styles.shareText}>Once issued, anyone with your license link can see your username, display name, bio, country and city, home region and badge identity, favorite bird, habitat preferences, birding interests, discovery preference, issue date, species total, and earned badges. Your email and date of birth are never public.</Text>
                  </View>
                </View>
                {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
                <View style={styles.buttonRow}>
                  <Pressable onPress={() => setStep(2)} style={styles.backButton}><ArrowLeft color={colors.inkSoft} size={17} /><Text style={styles.backText}>Back</Text></Pressable>
                  <Pressable disabled={submitting} onPress={() => void saveProfile()} style={[styles.primaryButton, submitting && styles.disabled]}>
                    {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Issue my license</Text>}
                    {!submitting && <ArrowRight color={colors.white} size={18} />}
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.footer}><View style={styles.footerRule} /><Text style={styles.footerText}>PUBLIC FIELD CREDENTIAL · PRIVATE ACCOUNT DETAILS</Text></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 },
  blockedWrap: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', padding: 28, maxWidth: 560, alignSelf: 'center' },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 33 },
  brandMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  wordmark: { color: colors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.15 },
  wordmarkSub: { color: colors.muted, fontSize: 9, letterSpacing: 1.1 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 8 },
  title: { color: colors.ink, fontSize: 31, fontWeight: '800', letterSpacing: -1.2, marginTop: 7 },
  titlePeriod: { color: colors.coral },
  bodyText: { color: colors.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 8 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 19, maxWidth: 420 },
  stepItem: { alignItems: 'center', gap: 6, minWidth: 75 },
  stepDot: { width: 29, height: 29, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  stepNumber: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  stepNumberActive: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  stepLabelActive: { color: colors.ink },
  formPanel: { padding: 18, backgroundColor: '#F2F1E9', borderWidth: 1, borderColor: colors.line, gap: 10 },
  label: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginTop: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 13, paddingVertical: 11, color: colors.ink, fontSize: 14 },
  multiline: { minHeight: 85, textAlignVertical: 'top' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, backgroundColor: '#E8EFE5', marginTop: 8 },
  privacyText: { flex: 1, color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  errorText: { color: colors.danger, backgroundColor: colors.coralPale, padding: 11, fontSize: 12, lineHeight: 18 },
  primaryButton: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: colors.ink },
  primaryButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  backButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10 },
  backText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  regionList: { maxHeight: 150 },
  regionListContent: { gap: 6 },
  regionOption: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 9 },
  regionOptionActive: { borderColor: colors.ink, backgroundColor: '#E4EAE0' },
  regionText: { color: colors.inkSoft, fontSize: 12, fontWeight: '600' },
  regionTextActive: { color: colors.ink, fontWeight: '800' },
  avatarPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, marginBottom: 4 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8EFE5', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarCopy: { flex: 1 },
  avatarTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  avatarSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 8 },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: colors.white },
  publicDisclosure: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13, borderWidth: 1, borderColor: '#D8C99D', backgroundColor: '#EAE5D5', marginTop: 4 },
  disclosureCopy: { flex: 1 },
  shareTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  shareText: { color: colors.inkSoft, fontSize: 11, lineHeight: 17, marginTop: 4 },
  providerNotice: { flexDirection: 'row', gap: 10, padding: 13, marginTop: 23, backgroundColor: '#E8EFE5' },
  providerNoticeText: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, flex: 1 },
  outButton: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 22, marginTop: 20, alignSelf: 'stretch' },
  outButtonText: { color: colors.ink, fontWeight: '800' },
  footer: { alignItems: 'center', paddingTop: 28, paddingBottom: 10 },
  footerRule: { height: 1, width: 45, backgroundColor: colors.leafDeep, marginBottom: 10 },
  footerText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
});
