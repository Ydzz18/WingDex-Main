import { useCallback, useEffect, useRef, useState } from 'react';
import { Bird } from 'lucide-react-native';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { colors } from '../theme';

type SplashRevealProps = {
  onFinish: () => void;
};

export function SplashReveal({ onFinish }: SplashRevealProps) {
  const audioPlayer = useAudioPlayer(require('../../assets/splash-chirp.wav'));
  const [markOpacity] = useState(() => new Animated.Value(0));
  const [markScale] = useState(() => new Animated.Value(0.88));
  const [markOffset] = useState(() => new Animated.Value(14));
  const [wordmarkOpacity] = useState(() => new Animated.Value(0));
  const [wordmarkOffset] = useState(() => new Animated.Value(8));
  const [taglineOpacity] = useState(() => new Animated.Value(0));
  const [taglineOffset] = useState(() => new Animated.Value(6));
  const [overlayOpacity] = useState(() => new Animated.Value(1));
  const audioPlayerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const hasFinished = useRef(false);
  const isDismissing = useRef(false);
  const motionAllowsAudio = useRef(false);
  const audioAttempted = useRef(false);
  const audioModeReady = useRef<Promise<boolean> | null>(null);
  const useNativeDriver = Platform.OS !== 'web';

  const finish = useCallback(() => {
    if (hasFinished.current) return;
    hasFinished.current = true;
    onFinish();
  }, [onFinish]);

  const dismiss = useCallback(() => {
    if (hasFinished.current || isDismissing.current) return;
    isDismissing.current = true;
    animationRef.current?.stop();
    const fade = Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.quad),
      useNativeDriver,
    });
    animationRef.current = fade;
    fade.start(({ finished }) => {
      if (animationRef.current === fade) animationRef.current = null;
      if (finished) finish();
    });
  }, [finish, overlayOpacity, useNativeDriver]);

  const playChirp = useCallback(
    (fromGesture = false) => {
      if (!motionAllowsAudio.current || audioAttempted.current) return;
      if (Platform.OS === 'web' && !fromGesture) return;
      audioAttempted.current = true;

      const play = () => {
        if (
          !motionAllowsAudio.current ||
          hasFinished.current ||
          isDismissing.current
        ) {
          return;
        }
        const player = audioPlayerRef.current;
        if (!player) return;
        try {
          player.loop = false;
          player.volume = 0.24;
          player.play();
        } catch {
          // Audio is best-effort and must not interrupt the splash.
        }
      };

      if (Platform.OS === 'web') {
        play();
        return;
      }

      const modeReady = audioModeReady.current;
      if (modeReady) {
        void modeReady.then((ready) => {
          if (ready) play();
        });
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    audioPlayerRef.current = audioPlayer;

    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (reduceMotionEnabled) => {
        if (reduceMotionEnabled) {
          motionAllowsAudio.current = false;
          try {
            audioPlayerRef.current?.pause();
          } catch {
            // A failed audio pause must not interrupt reduced-motion handling.
          }
          animationRef.current?.stop();
          animationRef.current = null;
          finish();
        }
      },
    );

    const play = async () => {
      let reduceMotionEnabled = false;
      try {
        reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        // Continue with the standard reveal when the platform check is unavailable.
      }

      if (cancelled || hasFinished.current || isDismissing.current) return;
      if (reduceMotionEnabled) {
        motionAllowsAudio.current = false;
        finish();
        return;
      }

      if (!audioModeReady.current) {
        audioModeReady.current =
          Platform.OS === 'web'
            ? Promise.resolve(true)
            : Promise.resolve()
                .then(() =>
                  setAudioModeAsync({
                    playsInSilentMode: false,
                    interruptionMode: 'mixWithOthers',
                  }),
                )
                .then(() => true)
                .catch(() => false);
      }

      motionAllowsAudio.current = true;
      playChirp();
      const sequence = Animated.sequence([
        Animated.parallel([
          Animated.timing(markOpacity, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
          Animated.spring(markScale, {
            toValue: 1,
            friction: 7,
            tension: 58,
            useNativeDriver,
          }),
          Animated.timing(markOffset, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver,
          }),
        ]),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          }),
          Animated.timing(wordmarkOffset, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver,
          }),
          Animated.sequence([
            Animated.delay(70),
            Animated.parallel([
              Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver,
              }),
              Animated.timing(taglineOffset, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver,
              }),
            ]),
          ]),
        ]),
        Animated.delay(160),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver,
        }),
      ]);

      animationRef.current = sequence;
      sequence.start(({ finished }) => {
        if (animationRef.current === sequence) animationRef.current = null;
        if (finished) finish();
      });
    };

    void play();

    return () => {
      cancelled = true;
      motionAllowsAudio.current = false;
      audioPlayerRef.current = null;
      animationRef.current?.stop();
      animationRef.current = null;
      motionSubscription.remove();
    };
  }, [
    finish,
    markOpacity,
    markScale,
    markOffset,
    wordmarkOpacity,
    wordmarkOffset,
    taglineOpacity,
    taglineOffset,
    overlayOpacity,
    useNativeDriver,
    audioPlayer,
    playChirp,
  ]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="Skip intro and continue to WingDex"
        accessibilityHint="Dismisses the launch screen"
        accessibilityViewIsModal
        onPress={() => {
          playChirp(true);
          dismiss();
        }}
        style={styles.dismissTarget}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.emblem,
              {
                opacity: markOpacity,
                transform: [{ scale: markScale }, { translateY: markOffset }],
              },
            ]}
          >
            <View style={styles.outerOrbit} />
            <View style={styles.innerOrbit} />
            <View style={styles.iconDisc}>
              <Bird color={colors.paper} size={70} strokeWidth={1.45} />
            </View>
            <View style={styles.accentDot} />
          </Animated.View>

          <Animated.Text
            style={[
              styles.wordmark,
              {
                opacity: wordmarkOpacity,
                transform: [{ translateY: wordmarkOffset }],
              },
            ]}
          >
            WingDex
          </Animated.Text>
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineOpacity,
                transform: [{ translateY: taglineOffset }],
              },
            ]}
          >
            Explore. Identify. Discover.
          </Animated.Text>
        </View>
        <Animated.Text style={styles.tapCue}>
          Tap to continue
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: colors.ink,
  },
  dismissTarget: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  tapCue: {
    position: 'absolute',
    bottom: 42,
    color: colors.leaf,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  emblem: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 29,
  },
  outerOrbit: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(200, 213, 199, 0.34)',
  },
  innerOrbit: {
    position: 'absolute',
    width: 166,
    height: 166,
    borderRadius: 83,
    borderWidth: 1,
    borderColor: 'rgba(200, 213, 199, 0.5)',
  },
  iconDisc: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkSoft,
    borderWidth: 1,
    borderColor: colors.leafDeep,
  },
  accentDot: {
    position: 'absolute',
    top: 28,
    right: 34,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.coral,
  },
  wordmark: {
    color: colors.paper,
    fontFamily: 'Georgia',
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 9,
    color: colors.leaf,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.25,
  },
});
