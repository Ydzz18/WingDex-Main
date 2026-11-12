import { useCallback, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { SplashReveal } from '../src/components/SplashReveal';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(() => !supabase);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    let receivedAuthEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedAuthEvent = true;
      if (!active) return;
      setSession(nextSession);
      setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || receivedAuthEvent) return;
      if (error) {
        console.error('Could not restore the saved sign-in session:', error);
        setSession(null);
      } else {
        setSession(data.session);
      }

      setSessionReady(true);
    }).catch((error: unknown) => {
      if (!active || receivedAuthEvent) return;
      console.error('Could not restore the saved sign-in session:', error);
      setSession(null);
      setSessionReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const finishSplash = useCallback(() => setSplashFinished(true), []);
  const showSplash = !splashFinished || !sessionReady;

  return (
    <SafeAreaProvider>
      <StatusBar style={showSplash ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
        <Stack.Protected guard={sessionReady && Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="bird/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!sessionReady || !session}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
      </Stack>
      {showSplash && <SplashReveal onFinish={finishSplash} />}
    </SafeAreaProvider>
  );
}