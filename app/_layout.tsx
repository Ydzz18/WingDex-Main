import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { SplashReveal } from '../src/components/SplashReveal';
import { supabase } from '../src/services/supabase';
import { getLicenseAccessState, subscribeToLicenseAccess } from '../src/services/birdingLicense';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(() => !supabase);
  const [appAccess, setAppAccess] = useState<'checking' | 'allowed' | 'blocked' | 'error' | 'signed-out'>(
    () => supabase ? 'checking' : 'signed-out',
  );
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    let receivedAuthEvent = false;
    const refreshAccess = async (userId: string) => {
      setAppAccess('checking');
      try {
        const status = await getLicenseAccessState();
        if (active && sessionUserId.current === userId) {
          setAppAccess(status.is_adult && status.profile_complete ? 'allowed' : 'blocked');
        }
      } catch (error) {
        console.error('Could not verify the account access status:', error);
        if (active && sessionUserId.current === userId) setAppAccess('error');
      }
    };
    const sessionUserId = { current: '' };
    const updateSession = (nextSession: Session | null) => {
      sessionUserId.current = nextSession?.user.id ?? '';
      setSession(nextSession);
      if (nextSession) void refreshAccess(nextSession.user.id);
      else setAppAccess('signed-out');
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (!active) return;
      updateSession(nextSession);
      setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) {
        console.error('Could not restore the saved sign-in session:', error);
        updateSession(null);
      } else {
        updateSession(data.session);
      }

      setSessionReady(true);
    }).catch((error: unknown) => {
      if (!active || receivedAuthEvent) return;
      console.error('Could not restore the saved sign-in session:', error);
      updateSession(null);
      setSessionReady(true);
    });

    const unsubscribeAccess = subscribeToLicenseAccess(() => {
      const currentUserId = sessionUserId.current;
      if (currentUserId) void refreshAccess(currentUserId);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribeAccess();
    };
  }, []);

  const finishSplash = useCallback(() => setSplashFinished(true), []);
  const showSplash = !splashFinished || !sessionReady;

  return (
    <SafeAreaProvider>
      <StatusBar style={showSplash ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={sessionReady && Boolean(session) && appAccess === 'allowed'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="bird/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={sessionReady && Boolean(session) && appAccess !== 'allowed'}>
          <Stack.Screen name="complete-profile" />
        </Stack.Protected>
        <Stack.Protected guard={!sessionReady || !session}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Screen name="license/[licenseNumber]" />
      </Stack>
      {showSplash && <SplashReveal onFinish={finishSplash} />}
    </SafeAreaProvider>
  );
}