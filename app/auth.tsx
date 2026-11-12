import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { router } from 'expo-router';
import { ArrowLeft, ArrowUpRight, CodeXml, Feather, Leaf, LockKeyhole, Mail, ShieldCheck } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../src/services/supabase';
import { colors } from '../src/theme';

type AuthMode = 'login' | 'signup' | 'reset' | 'recovery';
type OAuthProvider = 'google' | 'facebook' | 'github';
type Notice = { kind: 'success' | 'error'; text: string };

const RECOVERY_PENDING_KEY = 'wingdex.auth.recovery-pending';

function friendlyError(message: string) {
  return message.replace(/^AuthApiError:\s*/i, '').trim();
}

function parseAuthUrl(link: string) {
  const parsed = new URL(link);
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  return {
    code: parsed.searchParams.get('code'),
    type: parsed.searchParams.get('type') ?? hash.get('type'),
    error: parsed.searchParams.get('error_description') ?? hash.get('error_description'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
  };
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);
  const [submitting, setSubmitting] = useState(false);
  const [oauthProvider, setOAuthProvider] = useState<OAuthProvider | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let active = true;
    const showError = (message: string) => {
      if (active) setNotice({ kind: 'error', text: friendlyError(message) });
    };

    const handleAuthLink = async (link: string) => {
      try {
        const callback = parseAuthUrl(link);
        if (callback.error) {
          await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
          showError(callback.error);
          return;
        }

        const recoveryPending = callback.type === 'recovery' ||
          Boolean(callback.code && await AsyncStorage.getItem(RECOVERY_PENDING_KEY));
        if (recoveryPending) {
          setMode('recovery');
          await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
        }

        if (callback.code) {
          const { data, error } = await client.auth.exchangeCodeForSession(callback.code);
          if (error) showError(error.message);
          else {
            setEmail(data.session?.user.email ?? '');
            if (!recoveryPending) {
              const message = 'Your email is confirmed. Your field journal is ready.';
              if (data.session) {
                router.replace({ pathname: '/user_profile', params: { authNotice: message } });
              } else {
                setNotice({ kind: 'success', text: message });
              }
            }
          }
        } else if (callback.accessToken && callback.refreshToken) {
          const { data, error } = await client.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });
          if (error) showError(error.message);
          else {
            setEmail(data.session?.user.email ?? '');
            if (!recoveryPending) {
              const message = 'Your email is confirmed. Your field journal is ready.';
              if (data.session) {
                router.replace({ pathname: '/user_profile', params: { authNotice: message } });
              } else {
                setNotice({ kind: 'success', text: message });
              }
            }
          }
        }
      } catch {
        showError('We couldn’t complete that email link. Please request a new one and try again.');
      }
    };

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setCheckingSession(false);
      if (error) showError(error.message);
    }).catch(() => {
      if (!active) return;
      setCheckingSession(false);
      showError('Your saved sign-in could not be restored. Please try again.');
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });
    const updateRefreshState = (state: string) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    };
    updateRefreshState(AppState.currentState);
    const appStateSubscription = AppState.addEventListener('change', updateRefreshState);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (active && url) void handleAuthLink(url);
    }).catch(() => {
      if (active) showError('We couldn’t open your email confirmation link.');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      appStateSubscription.remove();
      linkSubscription.remove();
    };
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    clearNotice();
  };

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    if (!supabase || submitting) return;
    setSubmitting(true);
    setOAuthProvider(provider);
    clearNotice();

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: ExpoLinking.createURL('auth'),
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });
      if (error) throw error;

      if (Platform.OS !== 'web') {
        if (!data.url) throw new Error('The sign-in provider did not return an authorization link.');
        await Linking.openURL(data.url);
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error
          ? friendlyError(error.message)
          : `Could not start ${provider === 'google' ? 'Google' : provider === 'facebook' ? 'Facebook' : 'GitHub'} sign-in. Please try again.`,
      });
    } finally {
      setSubmitting(false);
      setOAuthProvider(null);
    }
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    clearNotice();

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setNotice({ kind: 'error', text: 'Enter a valid email address to continue.' });
      return;
    }
    if (mode === 'login' && !password) {
      setNotice({ kind: 'error', text: 'Enter your password to log in.' });
      return;
    }
    if ((mode === 'signup' || mode === 'recovery') && password.length < 8) {
      setNotice({ kind: 'error', text: 'Choose a password with at least 8 characters.' });
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setNotice({ kind: 'error', text: 'Those passwords don’t match yet.' });
      return;
    }
    if (mode === 'recovery' && password !== confirmPassword) {
      setNotice({ kind: 'error', text: 'Those passwords don’t match yet.' });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: ExpoLinking.createURL('auth') },
        });
        if (error) throw error;
        setPassword('');
        setConfirmPassword('');
        const message = data.session
          ? 'Your account is ready. Welcome to your Wingdex field journal.'
          : 'Check your inbox for a confirmation link to finish creating your account.';
        if (data.session) {
          router.replace({ pathname: '/user_profile', params: { authNotice: message } });
        } else {
          setNotice({ kind: 'success', text: message });
        }
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) throw error;
        router.replace('/user_profile');
      } else if (mode === 'reset') {
        await AsyncStorage.setItem(RECOVERY_PENDING_KEY, 'true');
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: ExpoLinking.createURL('auth'),
        });
        if (error) {
          await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
          throw error;
        }
        setNotice({ kind: 'success', text: 'If an account exists for this address, a password reset link is on its way.' });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setConfirmPassword('');
        setMode('login');
        router.replace({
          pathname: '/user_profile',
          params: { authNotice: 'Your password has been updated.' },
        });
      }
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? friendlyError(error.message) : 'Something went wrong. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setSubmitting(true);
    clearNotice();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMode('login');
      setNotice({ kind: 'success', text: 'You’re signed out. Your saved birds remain on this device.' });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: error instanceof Error ? friendlyError(error.message) : 'We couldn’t sign you out. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'signup'
    ? 'Start your journal'
    : mode === 'reset'
      ? 'Find your way back'
      : mode === 'recovery'
        ? 'Set a new password'
        : 'Welcome';
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
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(112, insets.bottom + 88) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentColumn}>
            <View style={styles.topline}>
              <View style={styles.brandMark}><Leaf color={colors.paper} size={19} strokeWidth={2.2} /></View>
              <Text style={styles.wordmark}>WINGDEX <Text style={styles.wordmarkSub}>FIELD NOTES / 01</Text></Text>
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>YOUR PERSONAL FIELD JOURNAL</Text>
              <Text style={styles.title}>{title}<Text style={styles.titlePeriod}>.</Text></Text>
              <Text style={styles.introCopy}>
                {session && mode !== 'recovery'
                  ? 'A little more room for every bird you find.'
                  : mode === 'reset'
                    ? 'We’ll send a quiet note to help you back in.'
                    : mode === 'recovery'
                      ? 'Choose a fresh password for your Wingdex account.'
                      : 'Keep your discoveries close, wherever the trail leads.'}
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

            {session && mode !== 'recovery' ? (
              <View style={styles.accountPanel}>
                {notice && (
                  <View
                    accessibilityRole="alert"
                    style={[styles.message, notice.kind === 'error' ? styles.messageError : styles.messageSuccess]}
                  >
                    <Text style={[styles.messageText, notice.kind === 'error' ? styles.messageErrorText : styles.messageSuccessText]}>
                      {notice.text}
                    </Text>
                  </View>
                )}
                <View style={styles.signedInMark}><ShieldCheck color={colors.ink} size={22} /></View>
                <Text style={styles.panelEyebrow}>SIGNED IN AS</Text>
                <Text style={styles.accountEmail}>{session.user.email}</Text>
                <Text style={styles.accountCopy}>Your field journal is ready whenever you are.</Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={handleSignOut}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, submitting && styles.disabled]}
                >
                  {submitting ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.secondaryButtonText}>Sign out</Text>}
                </Pressable>
              </View>
            ) : (
              <>
                {(mode === 'login' || mode === 'signup') && (
                  <View style={styles.modeSelector} accessibilityRole="tablist">
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === 'login' }}
                      onPress={() => changeMode('login')}
                      style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                    >
                      <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>Log in</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected: mode === 'signup' }}
                      onPress={() => changeMode('signup')}
                      style={[styles.modeTab, mode === 'signup' && styles.modeTabActive]}
                    >
                      <Text style={[styles.modeTabText, mode === 'signup' && styles.modeTabTextActive]}>Create account</Text>
                    </Pressable>
                  </View>
                )}

                {(mode === 'login' || mode === 'signup') && (
                  <View style={styles.socialAuth}>
                    <View style={styles.socialDivider}>
                      <View style={styles.socialRule} />
                      <Text style={styles.socialDividerText}>OR CONTINUE WITH</Text>
                      <View style={styles.socialRule} />
                    </View>
                    <View style={styles.socialButtons}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Google"
                        accessibilityState={{ disabled: submitting || !isSupabaseConfigured }}
                        disabled={submitting || !isSupabaseConfigured}
                        onPress={() => void handleOAuthSignIn('google')}
                        style={({ pressed }) => [
                          styles.socialButton,
                          pressed && styles.pressed,
                          (submitting || !isSupabaseConfigured) && styles.disabled,
                        ]}
                      >
                        {submitting && oauthProvider === 'google' ? (
                          <ActivityIndicator color={colors.ink} size="small" />
                        ) : (
                          <Svg width={20} height={20} viewBox="0 0 48 48">
                            <Path
                              fill="#EA4335"
                              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                            />
                            <Path
                              fill="#4285F4"
                              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 3.01-2.31 5.57-4.94 7.28l7.98 6.19c4.67-4.31 7-10.65 7-17.94z"
                            />
                            <Path
                              fill="#FBBC05"
                              d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"
                            />
                            <Path
                              fill="#34A853"
                              d="M24 48c6.48 0 11.93-2.13 15.91-5.81l-7.98-6.19c-2.21 1.48-5.05 2.34-7.93 2.34-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                            />
                          </Svg>
                        )}
                        <Text style={styles.socialButtonText}>Google</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Continue with Facebook"
                        accessibilityState={{ disabled: submitting || !isSupabaseConfigured }}
                        disabled={submitting || !isSupabaseConfigured}
                        onPress={() => void handleOAuthSignIn('facebook')}
                        style={({ pressed }) => [
                          styles.socialButton,
                          pressed && styles.pressed,
                          (submitting || !isSupabaseConfigured) && styles.disabled,
                        ]}
                      >
                        {submitting && oauthProvider === 'facebook' ? (
                          <ActivityIndicator color={colors.ink} size="small" />
                        ) : (
                          <Text style={styles.facebookMark}>f</Text>
                        )}
                        <Text style={styles.socialButtonText}>Facebook</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Continue with GitHub"
                        accessibilityState={{ disabled: submitting || !isSupabaseConfigured }}
                        disabled={submitting || !isSupabaseConfigured}
                        onPress={() => void handleOAuthSignIn('github')}
                        style={({ pressed }) => [
                          styles.socialButton,
                          pressed && styles.pressed,
                          (submitting || !isSupabaseConfigured) && styles.disabled,
                        ]}
                      >
                        {submitting && oauthProvider === 'github' ? (
                          <ActivityIndicator color={colors.ink} size="small" />
                        ) : (
                          <CodeXml color={colors.ink} size={20} />
                        )}
                        <Text style={styles.socialButtonText}>GitHub</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {mode === 'reset' && (
                  <Pressable onPress={() => changeMode('login')} style={styles.backLink} accessibilityRole="button">
                    <ArrowLeft size={15} color={colors.inkSoft} />
                    <Text style={styles.backLinkText}>Back to log in</Text>
                  </Pressable>
                )}

                <View style={styles.form}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrap}>
                    <Mail color={colors.muted} size={18} />
                    <TextInput
                      accessibilityLabel="Email address"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      onSubmitEditing={() => mode === 'reset' ? void handleSubmit() : undefined}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.muted}
                      returnKeyType={mode === 'reset' ? 'send' : 'next'}
                      style={styles.input}
                      textContentType="emailAddress"
                      value={email}
                    />
                  </View>

                  {mode !== 'reset' && (
                    <>
                      <View style={styles.passwordLabelRow}>
                        <Text style={styles.label}>{mode === 'recovery' ? 'NEW PASSWORD' : 'PASSWORD'}</Text>
                        {mode === 'login' && (
                          <Pressable onPress={() => changeMode('reset')} accessibilityRole="button">
                            <Text style={styles.forgotLink}>Forgot password?</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={styles.inputWrap}>
                        <LockKeyhole color={colors.muted} size={18} />
                        <TextInput
                          accessibilityLabel={mode === 'recovery' ? 'New password' : 'Password'}
                          autoCapitalize="none"
                          autoComplete={mode === 'signup' ? 'new-password' : 'password'}
                          onChangeText={setPassword}
                          onSubmitEditing={() => mode === 'login' ? void handleSubmit() : undefined}
                          placeholder={mode === 'recovery' || mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                          placeholderTextColor={colors.muted}
                          returnKeyType={mode === 'login' ? 'go' : 'next'}
                          secureTextEntry
                          style={styles.input}
                          textContentType={mode === 'signup' || mode === 'recovery' ? 'newPassword' : 'password'}
                          value={password}
                        />
                      </View>
                    </>
                  )}

                  {(mode === 'signup' || mode === 'recovery') && (
                    <>
                      <Text style={styles.label}>CONFIRM PASSWORD</Text>
                      <View style={styles.inputWrap}>
                        <LockKeyhole color={colors.muted} size={18} />
                        <TextInput
                          accessibilityLabel="Confirm password"
                          autoCapitalize="none"
                          autoComplete="new-password"
                          onChangeText={setConfirmPassword}
                          onSubmitEditing={() => void handleSubmit()}
                          placeholder="Enter your password again"
                          placeholderTextColor={colors.muted}
                          returnKeyType="go"
                          secureTextEntry
                          style={styles.input}
                          textContentType="newPassword"
                          value={confirmPassword}
                        />
                      </View>
                    </>
                  )}

                  {notice && (
                    <View
                      accessibilityRole="alert"
                      style={[styles.message, notice.kind === 'error' ? styles.messageError : styles.messageSuccess]}
                    >
                      <Text style={[styles.messageText, notice.kind === 'error' ? styles.messageErrorText : styles.messageSuccessText]}>
                        {notice.text}
                      </Text>
                    </View>
                  )}

                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || !isSupabaseConfigured}
                    onPress={() => void handleSubmit()}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.primaryButtonPressed,
                      (submitting || !isSupabaseConfigured) && styles.disabled,
                    ]}
                  >
                    {submitting
                      ? <ActivityIndicator color={colors.white} />
                      : <Text style={styles.primaryButtonText}>
                          {mode === 'signup' ? 'Create my account' : mode === 'reset' ? 'Send reset link' : mode === 'recovery' ? 'Update password' : 'Log in to Wingdex'}
                        </Text>}
                    {!submitting && <ArrowUpRight color={colors.white} size={18} />}
                  </Pressable>

                  {mode === 'signup' && (
                    <Text style={styles.privacyNote}>Your email stays yours. We’ll only use it to protect your account.</Text>
                  )}
                  {mode === 'reset' && (
                    <Text style={styles.privacyNote}>For your privacy, we’ll show the same confirmation either way.</Text>
                  )}
                </View>
              </>
            )}

            <View style={styles.footer}>
              <View style={styles.footerRule} />
              <Text style={styles.footerText}>MADE FOR THE MOMENTS BETWEEN WINGS</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  keyboard: { flex: 1 },
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
  configNotice: {
    flexDirection: 'row', gap: 11, padding: 14, marginBottom: 17,
    borderWidth: 1, borderColor: colors.line, backgroundColor: '#F1F1E9',
  },
  noticeCopy: { flex: 1 },
  configTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 4 },
  configText: { color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  modeSelector: {
    flexDirection: 'row', padding: 4, backgroundColor: '#ECEEE6',
    borderRadius: 13, marginBottom: 21,
  },
  modeTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 10 },
  modeTabActive: { backgroundColor: colors.white, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 5, elevation: 1 },
  modeTabText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  modeTabTextActive: { color: colors.ink },
  socialAuth: { marginBottom: 19 },
  socialDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  socialRule: { height: 1, flex: 1, backgroundColor: colors.line },
  socialDividerText: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  socialButtons: { flexDirection: 'row', gap: 10 },
  socialButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  socialButtonText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  facebookMark: { color: '#1877F2', fontSize: 23, lineHeight: 25, fontWeight: '800' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 19, minHeight: 28 },
  backLinkText: { color: colors.inkSoft, fontSize: 13, fontWeight: '700' },
  form: { gap: 10 },
  label: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', letterSpacing: 1.15, marginTop: 2 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
  forgotLink: { color: colors.coral, fontSize: 12, fontWeight: '700' },
  inputWrap: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11,
    paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.white,
  },
  input: { flex: 1, minHeight: 50, color: colors.ink, fontSize: 15, paddingVertical: 0 },
  message: { padding: 12, borderRadius: 9, marginTop: 3 },
  messageError: { backgroundColor: colors.coralPale, borderWidth: 1, borderColor: '#E8C2B5' },
  messageSuccess: { backgroundColor: '#E8EFE5', borderWidth: 1, borderColor: '#C9D8C6' },
  messageText: { fontSize: 13, lineHeight: 19 },
  messageErrorText: { color: colors.danger },
  messageSuccessText: { color: colors.inkSoft },
  primaryButton: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 7, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.ink,
  },
  primaryButtonPressed: { backgroundColor: colors.inkSoft, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.15 },
  disabled: { opacity: 0.55 },
  privacyNote: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 3 },
  accountPanel: {
    paddingHorizontal: 20, paddingVertical: 23, alignItems: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: '#F2F1E9',
  },
  signedInMark: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.leaf,
    alignItems: 'center', justifyContent: 'center', marginBottom: 13,
  },
  panelEyebrow: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  accountEmail: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  accountCopy: { color: colors.inkSoft, fontSize: 13, marginTop: 7, textAlign: 'center' },
  secondaryButton: {
    minHeight: 45, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 9, marginTop: 20,
  },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  footer: { marginTop: 'auto', paddingTop: 36, alignItems: 'center' },
  footerRule: { height: 1, width: 48, backgroundColor: colors.leafDeep, marginBottom: 12 },
  footerText: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
});