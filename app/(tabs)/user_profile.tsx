import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUpRight, Feather, Leaf, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme';

type Notice = { kind: 'success' | 'error'; text: string };

function friendlyError(message: string) {
  return message.replace(/^AuthApiError:\s*/i, '').trim();
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { authNotice } = useLocalSearchParams<{ authNotice?: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setCheckingSession(false);
      if (error) setNotice({ kind: 'error', text: friendlyError(error.message) });
    }).catch(() => {
      if (!active) return;
      setCheckingSession(false);
      setNotice({ kind: 'error', text: 'Your saved sign-in could not be restored. Please try again.' });
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    if (!supabase) return;
    setSigningOut(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setNotice({ kind: 'success', text: 'You’re signed out. Your saved birds remain on this device.' });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? friendlyError(error.message) : 'We couldn’t sign you out. Please try again.',
      });
    } finally {
      setSigningOut(false);
    }
  };
  const visibleNotice = notice ?? (authNotice ? { kind: 'success' as const, text: authNotice } : null);

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.ink} size="large" />
          <Text style={styles.loadingText}>Opening your field journal…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(112, insets.bottom + 88) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentColumn}>
          <View style={styles.topline}>
            <View style={styles.brandMark}><Leaf color={colors.paper} size={19} strokeWidth={2.2} /></View>
            <Text style={styles.wordmark}>WINGDEX <Text style={styles.wordmarkSub}>FIELD NOTES / 01</Text></Text>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>YOUR PERSONAL FIELD JOURNAL</Text>
            <Text style={styles.title}>Your account<Text style={styles.titlePeriod}>.</Text></Text>
            <Text style={styles.introCopy}>
              Keep your discoveries close, wherever the trail leads.
            </Text>
          </View>

          <View style={styles.fieldNote}>
            <View style={styles.fieldNoteIcon}><Feather color={colors.ink} size={20} /></View>
            <View style={styles.fieldNoteCopy}>
              <Text style={styles.fieldNoteKicker}>FIELD NOTE <Text style={styles.noteIndex}>NO. 014</Text></Text>
              <Text style={styles.fieldNoteText}>Every new bird begins with a closer look.</Text>
            </View>
            <Text style={styles.fieldNoteMark}>✳</Text>
          </View>

          <View style={styles.accountPanel}>
            {visibleNotice && (
              <View
                accessibilityRole="alert"
                style={[styles.message, visibleNotice.kind === 'error' ? styles.messageError : styles.messageSuccess]}
              >
                <Text style={[styles.messageText, visibleNotice.kind === 'error' ? styles.messageErrorText : styles.messageSuccessText]}>
                  {visibleNotice.text}
                </Text>
              </View>
            )}
            {session ? (
              <>
                <View style={styles.signedInMark}><ShieldCheck color={colors.ink} size={22} /></View>
                <Text style={styles.panelEyebrow}>SIGNED IN AS</Text>
                <Text style={styles.accountEmail}>{session.user.email}</Text>
                <Text style={styles.accountCopy}>Your field journal is ready whenever you are.</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={signingOut}
                  onPress={() => void handleSignOut()}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, signingOut && styles.disabled]}
                >
                  {signingOut
                    ? <ActivityIndicator color={colors.ink} />
                    : <Text style={styles.secondaryButtonText}>Sign out</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.signedInMark}><Leaf color={colors.ink} size={22} /></View>
                <Text style={styles.panelEyebrow}>YOUR FIELD JOURNAL</Text>
                <Text style={styles.panelTitle}>Make room for every bird you find.</Text>
                <Text style={styles.accountCopy}>
                  Sign in or create an account to keep your Wingdex journal with you.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/auth')}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
                >
                  <Text style={styles.primaryButtonText}>Sign in or create account</Text>
                  <ArrowUpRight color={colors.white} size={18} />
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRule} />
            <Text style={styles.footerText}>MADE FOR THE MOMENTS BETWEEN WINGS</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 16, paddingBottom: 28 },
  contentColumn: { width: '100%', maxWidth: 560, flexGrow: 1, alignSelf: 'center' },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: colors.inkSoft, fontSize: 15 },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  wordmark: { color: colors.ink, fontSize: 12, fontWeight: '800', letterSpacing: 1.15 },
  wordmarkSub: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  intro: { marginTop: 34, marginBottom: 22 },
  eyebrow: { color: colors.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.5, marginTop: 8 },
  titlePeriod: { color: colors.coral },
  introCopy: { color: colors.inkSoft, fontSize: 15, lineHeight: 23, marginTop: 8, maxWidth: 310 },
  fieldNote: {
    minHeight: 76, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF1E8', borderLeftWidth: 3, borderLeftColor: colors.leafDeep,
    paddingHorizontal: 14, paddingVertical: 11, marginBottom: 23,
  },
  fieldNoteIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.leaf,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  fieldNoteCopy: { flex: 1 },
  fieldNoteKicker: { color: colors.inkSoft, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  noteIndex: { color: colors.coral, fontWeight: '700' },
  fieldNoteText: { color: colors.ink, fontSize: 13, marginTop: 5, fontWeight: '600' },
  fieldNoteMark: { color: colors.coral, fontSize: 23, marginLeft: 8 },
  accountPanel: {
    paddingHorizontal: 20, paddingVertical: 23, alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: '#F2F1E9',
  },
  message: { alignSelf: 'stretch', padding: 12, borderRadius: 9, marginBottom: 17 },
  messageError: { backgroundColor: colors.coralPale, borderWidth: 1, borderColor: '#E8C2B5' },
  messageSuccess: { backgroundColor: '#E8EFE5', borderWidth: 1, borderColor: '#C9D8C6' },
  messageText: { fontSize: 13, lineHeight: 19 },
  messageErrorText: { color: colors.danger },
  messageSuccessText: { color: colors.inkSoft },
  signedInMark: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.leaf,
    alignItems: 'center', justifyContent: 'center', marginBottom: 13,
  },
  panelEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  panelTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  accountEmail: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  accountCopy: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' },
  primaryButton: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', marginTop: 19, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.ink,
  },
  primaryButtonPressed: { backgroundColor: colors.inkSoft, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.15 },
  secondaryButton: {
    minHeight: 45, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 9, marginTop: 20,
  },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.75 },
  footer: { marginTop: 'auto', paddingTop: 36, alignItems: 'center' },
  footerRule: { height: 1, width: 48, backgroundColor: colors.leafDeep, marginBottom: 12 },
  footerText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
});
