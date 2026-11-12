import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookmarkPlus,
  Camera,
  Check,
  Flashlight,
  ImagePlus,
  Leaf,
  RotateCcw,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import type { CameraView as CameraViewType } from 'expo-camera';
import { useSavedBirds } from '../../src/hooks/useSavedBirds';
import {
  identifyBird,
  isIdentificationConfigured,
  minimumConfidence,
  type IdentificationResult,
} from '../../src/services/identification';
import { getCurrentLocation, type UserLocation } from '../../src/services/location';
import { colors } from '../../src/theme';

const CAMERA_PERMISSION_ASKED_KEY = 'wingdex.camera-permission-asked.v1';

type CapturedPhoto = {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
};

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraViewType>(null);
  const [permission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const permissionRequestAttempted = useRef(false);
  const { addObservation } = useSavedBirds();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saveLocationError, setSaveLocationError] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryCanAskAgain, setGalleryCanAskAgain] = useState(true);
  const identificationInProgress = useRef(false);
  const saveInProgress = useRef(false);
  const cameraSupportedInApp = Platform.OS !== 'web';
  const cameraGranted = Boolean(permission?.granted);
  const busy = capturing || identifying || choosingPhoto || saving;

  useEffect(() => {
    if (!cameraSupportedInApp || !permission || permissionRequestAttempted.current) return;
    permissionRequestAttempted.current = true;
    let active = true;

    const requestPermissionOnce = async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(CAMERA_PERMISSION_ASKED_KEY);
        if (!active) return;
        if (permission.granted || !permission.canAskAgain || alreadyAsked) return;

        await AsyncStorage.setItem(CAMERA_PERMISSION_ASKED_KEY, 'true');
        if (active) await requestCameraPermission();
      } catch {
        if (active) setCameraError(true);
      }
    };

    void requestPermissionOnce();
    return () => {
      active = false;
    };
  }, [cameraSupportedInApp, permission, requestCameraPermission]);

  const saveObservation = async (
    resultToSave: IdentificationResult,
    selectedPhoto: CapturedPhoto,
    openObservation: boolean,
  ) => {
    if (saveInProgress.current || saved) return;
    saveInProgress.current = true;
    setSaving(true);
    setSaveError(false);
    setSaveLocationError(null);

    try {
      let location: UserLocation | null = null;
      let locationUnavailable = false;
      try {
        location = await getCurrentLocation();
      } catch (error) {
        locationUnavailable = true;
        setSaveLocationError(
          error instanceof Error ? error.message : 'Location was unavailable for this sighting.',
        );
      }

      const observation = await addObservation(resultToSave, selectedPhoto.uri, location);
      setSaved(true);
      if (openObservation) {
        router.replace({
          pathname: '/bird/[id]',
          params: {
            id: observation.id,
            ...(locationUnavailable ? { locationUnavailable: 'true' } : {}),
          },
        });
      }
    } catch {
      setSaveError(true);
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const identifyPhoto = async (selectedPhoto: CapturedPhoto) => {
    if (identificationInProgress.current) return;
    identificationInProgress.current = true;
    setPhoto(selectedPhoto);
    setResult(null);
    setIdentificationError(null);
    setSaveError(false);
    setSaveLocationError(null);
    setSaved(false);
    setIdentifying(true);

    try {
      if (!isIdentificationConfigured()) {
        throw new Error('Bird identification is not connected yet. Please try again later.');
      }

      const identification = await identifyBird(
        selectedPhoto.uri,
        selectedPhoto.fileName,
        selectedPhoto.mimeType,
      );
      setResult(identification);
      if (
        identification.commonName &&
        identification.scientificName &&
        identification.confidence >= minimumConfidence
      ) {
        await saveObservation(identification, selectedPhoto, true);
      }
    } catch (error) {
      setIdentificationError(
        error instanceof Error
          ? error.message
          : 'We couldn’t identify this photo. Please try again.'
      );
    } finally {
      identificationInProgress.current = false;
      setIdentifying(false);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;

    setCapturing(true);
    setGalleryError(null);
    setTorchEnabled(false);

    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!captured?.uri) throw new Error('The camera did not return a photo.');

      await identifyPhoto({
        uri: captured.uri,
        fileName: 'bird-sighting.jpg',
        mimeType: 'image/jpeg',
      });
    } catch {
      setCameraReady(false);
      setCameraError(true);
    } finally {
      setCapturing(false);
    }
  };

  const choosePhoto = async () => {
    if (busy) return;
    setGalleryError(null);
    setChoosingPhoto(true);

    try {
      if (Platform.OS !== 'web') {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setGalleryCanAskAgain(mediaPermission.canAskAgain);
        if (!mediaPermission.granted) {
          setGalleryError(
            mediaPermission.canAskAgain
              ? 'Photo access is needed to choose an image. You can try again or allow access in Settings.'
              : 'Photo access is off. Allow it in your device Settings, then try again.'
          );
          setChoosingPhoto(false);
          return;
        }
      }

      const selection = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (selection.canceled || !selection.assets[0]) return;

      const asset = selection.assets[0];
      await identifyPhoto({
        uri: asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
    } catch {
      setGalleryError('We couldn’t open that photo. Please try choosing it again.');
    } finally {
      setChoosingPhoto(false);
    }
  };

  const retake = () => {
    setPhoto(null);
    setResult(null);
    setIdentificationError(null);
    setSaveError(false);
    setSaveLocationError(null);
    setSaved(false);
    setCameraReady(false);
  };

  const checkCameraPermission = async () => {
    try {
      await getCameraPermission();
    } catch {
      setCameraError(true);
    }
  };

  const openSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {
      setCameraError(true);
    }
  };

  const uncertain = result
    ? !result.commonName ||
      !result.scientificName ||
      result.confidence < minimumConfidence
    : false;
  const confidentlyIdentified = Boolean(result && !uncertain);

  return (
    <View style={styles.screen}>
      {photo ? (
        <Image source={{ uri: photo.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : cameraSupportedInApp && cameraGranted && !cameraError ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torchEnabled}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() => {
            setCameraReady(false);
            setCameraError(true);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.forestBackdrop]} />
      )}

      <View pointerEvents="none" style={[styles.topShade, { height: insets.top + 230 }]} />
      <View pointerEvents="none" style={[styles.bottomShade, { height: insets.bottom + 245 }]} />

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to Explore"
            onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))}
            style={[styles.headerButton, styles.headerBack]}
            hitSlop={8}
          >
            {router.canGoBack() ? (
              <ArrowLeft color={colors.white} size={21} />
            ) : (
              <X color={colors.white} size={21} />
            )}
          </Pressable>

          <View style={styles.brand}>
            <Text style={styles.brandEyebrow}>FIELD CAMERA</Text>
            <Text style={styles.brandTitle}>Bird ID</Text>
          </View>

          {cameraSupportedInApp && cameraGranted && cameraReady && !photo && !cameraError && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={torchEnabled ? 'Turn torch off' : 'Turn torch on'}
              accessibilityState={{ selected: torchEnabled }}
              onPress={() => setTorchEnabled((enabled) => !enabled)}
              style={[
                styles.headerButton,
                styles.headerTorch,
                torchEnabled && styles.torchButtonActive,
              ]}
              hitSlop={8}
            >
              <Flashlight color={torchEnabled ? colors.ink : colors.white} size={20} />
            </Pressable>
          )}
        </View>

        <View style={styles.intro}>
          <Text style={styles.heading}>
            {photo ? 'A closer look.' : 'Meet your next discovery.'}
          </Text>
          <Text style={styles.subheading}>
            {!photo
              ? 'Keep the bird inside the frame.'
              : identifying
                ? saving
                  ? 'Saving your sighting and checking its location.'
                  : 'Your photo is being checked against the field guide.'
                : identificationError
                  ? 'Your photo is ready to retry or retake.'
                  : result
                    ? uncertain
                      ? 'This is a possible match. Check its confidence before saving.'
                      : 'Identification complete. Save this sighting to your collection.'
                    : 'Preparing your photo for identification.'}
          </Text>
        </View>

        {!photo && cameraSupportedInApp && cameraGranted && !cameraError ? (
          <View style={styles.liveArea}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              <View style={styles.frameHint}>
                <Text style={styles.frameHintText}>COMPOSITION GUIDE</Text>
              </View>
            </View>
            {!cameraReady && (
              <View style={styles.cameraLoading}>
                <ActivityIndicator color={colors.white} />
                <Text style={styles.cameraLoadingText}>Waking the camera…</Text>
              </View>
            )}
          </View>
        ) : photo ? (
          <View style={styles.resultArea}>
            {identifying ? (
              <View style={styles.resultCard}>
                <ActivityIndicator color={colors.leafDeep} size="small" />
                <View style={styles.resultCopy}>
                  <Text style={styles.resultEyebrow}>FIELD NOTES</Text>
                  <Text style={styles.resultName}>
                    {saving ? 'Saving your sighting…' : 'Looking closely…'}
                  </Text>
                  <Text style={styles.resultDetail}>
                    {saving ? 'Checking your location and adding the bird to your field notes' : 'Checking this photo for a bird'}
                  </Text>
                </View>
              </View>
            ) : identificationError ? (
              <View style={styles.resultCard}>
                <View style={styles.alertIcon}>
                  <TriangleAlert color={colors.yellow} size={19} />
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultEyebrow}>IDENTIFICATION PAUSED</Text>
                  <Text style={styles.resultName}>We couldn’t finish</Text>
                  <Text style={styles.resultDetail}>{identificationError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => identifyPhoto(photo)}
                    style={styles.retryTextButton}
                  >
                    <Text style={styles.retryText}>Try identification again</Text>
                  </Pressable>
                </View>
              </View>
            ) : result ? (
              <View style={styles.resultCard}>
                <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.thumbnail} />
                <View style={styles.resultCopy}>
                  <Text style={styles.resultEyebrow}>
                    {uncertain ? 'POSSIBLE MATCH' : 'IDENTIFIED'}
                  </Text>
                  <Text style={styles.resultName}>
                    {result.commonName ?? 'No clear species match'}
                  </Text>
                  {result.scientificName ? (
                    <Text style={styles.resultDetail} numberOfLines={1}>
                      {result.scientificName}
                    </Text>
                  ) : null}
                  <Text style={styles.confidence}>
                    Confidence · {Math.round(result.confidence * 100)}%
                  </Text>
                  {uncertain && (
                    <>
                      <Text style={styles.uncertainNote}>
                        Below the {Math.round(minimumConfidence * 100)}% confirmation threshold
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        disabled={busy}
                        onPress={() => void identifyPhoto(photo)}
                        style={styles.retryTextButton}
                      >
                        <Text style={styles.retryText}>Try identification again</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: saving || saved }}
                    disabled={saving || saved}
                    onPress={() => {
                      if (result && photo) {
                        void saveObservation(result, photo, confidentlyIdentified);
                      }
                    }}
                    style={[styles.saveButton, saved && styles.saveButtonDone]}
                  >
                    {saving ? (
                      <ActivityIndicator color={colors.ink} size="small" />
                    ) : saved ? (
                      <Check color={colors.ink} size={16} />
                    ) : (
                      <BookmarkPlus color={colors.ink} size={16} />
                    )}
                    <Text style={styles.saveButtonText}>
                      {saving
                        ? 'Saving…'
                        : saved
                          ? 'Saved to collection'
                          : uncertain
                            ? 'Save observation'
                            : 'Save sighting'}
                    </Text>
                  </Pressable>
                  {saveError && (
                    <Text style={styles.saveError}>Couldn’t save. Please try again.</Text>
                  )}
                  {saved && saveLocationError && (
                    <Text style={styles.saveError}>
                      Saved without location. {saveLocationError}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.accessArea}>
            <View style={styles.accessPanel}>
              <View style={styles.accessIcon}>
                {cameraSupportedInApp && !cameraError ? (
                  <Camera color={colors.leafDeep} size={24} />
                ) : (
                  <ImagePlus color={colors.leafDeep} size={24} />
                )}
              </View>
              <Text style={styles.accessTitle}>
                {!cameraSupportedInApp
                  ? 'Choose a photo to begin'
                  : cameraError
                    ? 'Camera unavailable'
                    : permission?.granted
                      ? 'Camera couldn’t start'
                      : permission
                        ? 'Camera access wasn’t granted'
                        : 'Getting camera ready'}
              </Text>
              <Text style={styles.accessDescription}>
                {!cameraSupportedInApp
                  ? 'Camera preview is not available in this app environment. A photo still works just as well for identification.'
                  : cameraError
                    ? 'This device couldn’t start its camera. You can try again or identify a photo instead.'
                    : permission?.granted
                      ? 'Try the camera again, or choose a photo from your library.'
                      : permission
                        ? 'You can still identify a bird from your photos. To enable the camera later, open device settings.'
                        : 'Camera permission is requested once when you open the scanner. You can also choose a photo instead.'}
              </Text>
              {cameraSupportedInApp && permission && !cameraGranted && (
                <View style={styles.settingsActions}>
                  <Pressable accessibilityRole="button" onPress={openSettings} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>Open device settings</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={checkCameraPermission} style={styles.settingsTextButton}>
                    <Text style={styles.settingsText}>Check permission again</Text>
                  </Pressable>
                </View>
              )}
              {cameraSupportedInApp && cameraError && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setCameraError(false);
                    setCameraReady(false);
                  }}
                  style={styles.permissionButton}
                >
                  <RotateCcw color={colors.ink} size={16} />
                  <Text style={styles.permissionButtonText}>Try camera again</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={choosePhoto}
                style={styles.libraryTextButton}
              >
                {choosingPhoto ? (
                  <ActivityIndicator color={colors.leafDeep} size="small" />
                ) : (
                  <ImagePlus color={colors.leafDeep} size={17} />
                )}
                <Text style={styles.libraryText}>Choose from photos</Text>
              </Pressable>
            </View>
          </View>
        )}

        {galleryError && (
          <View accessibilityLiveRegion="polite" style={styles.galleryNotice}>
            <Text style={styles.galleryNoticeText}>{galleryError}</Text>
            {!galleryCanAskAgain && (
              <Pressable accessibilityRole="button" onPress={openSettings}>
                <Text style={styles.gallerySettingsText}>Open settings</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.bottomArea}>
          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photo ? 'Choose another photo' : 'Choose a photo from your library'}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={choosePhoto}
              style={[styles.galleryButton, busy && styles.buttonDisabled]}
            >
              {choosingPhoto ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <ImagePlus color={colors.white} size={21} />
              )}
              <Text style={styles.controlLabel}>{photo ? 'Another photo' : 'Photos'}</Text>
            </Pressable>

            {cameraSupportedInApp && cameraGranted && !cameraError && !photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={cameraReady ? 'Take a bird photo' : 'Camera is starting'}
                accessibilityState={{ disabled: !cameraReady || busy }}
                disabled={!cameraReady || busy}
                onPress={takePhoto}
                style={[styles.shutterOuter, (!cameraReady || busy) && styles.shutterDisabled]}
              >
                {capturing ? (
                  <ActivityIndicator color={colors.ink} size="small" />
                ) : (
                  <View style={styles.shutterInner} />
                )}
              </Pressable>
            ) : photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retake photo"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={retake}
                style={styles.retakeControl}
              >
                <View style={styles.retakeIcon}>
                  <RotateCcw color={colors.white} size={21} />
                </View>
                <Text style={styles.controlLabel}>Retake</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.wildlifeNote}>
            <Leaf color={colors.leafDeep} size={14} />
            <Text style={styles.wildlifeText}>Give wild birds space. Let them choose how close.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#16251F',
    overflow: 'hidden',
  },
  forestBackdrop: {
    backgroundColor: '#20372D',
  },
  topShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 22, 16, 0.32)',
  },
  bottomShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 22, 16, 0.62)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    position: 'relative',
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 28, 20, 0.48)',
  },
  headerBack: {
    position: 'absolute',
    left: 20,
  },
  headerTorch: {
    position: 'absolute',
    right: 20,
  },
  torchButtonActive: {
    backgroundColor: colors.leafDeep,
  },
  brand: {
    alignItems: 'center',
  },
  brandEyebrow: {
    color: 'rgba(255, 255, 255, 0.67)',
    fontSize: 9,
    letterSpacing: 2.1,
    fontWeight: '700',
    marginBottom: 2,
  },
  brandTitle: {
    color: colors.white,
    fontSize: 17,
    letterSpacing: 0.3,
    fontWeight: '700',
  },
  intro: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
  },
  heading: {
    color: colors.white,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subheading: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
    textAlign: 'center',
  },
  liveArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  frame: {
    width: '78%',
    maxWidth: 330,
    height: '74%',
    maxHeight: 350,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderColor: '#D7E99B',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  frameHint: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor: 'rgba(11, 28, 20, 0.55)',
  },
  frameHintText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  cameraLoading: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    backgroundColor: 'rgba(11, 28, 20, 0.68)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cameraLoadingText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  accessArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  accessPanel: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    padding: 22,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(17, 40, 30, 0.89)',
    borderWidth: 1,
    borderColor: 'rgba(213, 231, 196, 0.18)',
  },
  accessIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 213, 199, 0.12)',
  },
  accessTitle: {
    color: colors.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  accessDescription: {
    color: 'rgba(255, 255, 255, 0.73)',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  permissionButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.leafDeep,
  },
  permissionButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  settingsActions: {
    alignItems: 'center',
    gap: 10,
  },
  settingsTextButton: {
    padding: 8,
  },
  settingsText: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  libraryTextButton: {
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  libraryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  resultArea: {
    flex: 1,
    minHeight: 160,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  resultCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(222, 233, 215, 0.17)',
    backgroundColor: 'rgba(18, 42, 31, 0.94)',
  },
  thumbnail: {
    width: 66,
    height: 78,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  alertIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: {
    flex: 1,
    minWidth: 0,
  },
  resultEyebrow: {
    color: colors.leafDeep,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  resultName: {
    color: colors.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  resultDetail: {
    color: 'rgba(255, 255, 255, 0.68)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  confidence: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  uncertainNote: {
    color: '#F0D78B',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  saveButton: {
    minHeight: 38,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.leafDeep,
  },
  saveButtonDone: {
    backgroundColor: '#DDE8D8',
  },
  saveButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  saveError: {
    color: '#F2B5A3',
    fontSize: 11,
    marginTop: 7,
  },
  retryTextButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 3,
  },
  retryText: {
    color: colors.leafDeep,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  galleryNotice: {
    marginHorizontal: 22,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(17, 40, 30, 0.92)',
  },
  galleryNoticeText: {
    color: colors.white,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  gallerySettingsText: {
    color: colors.leafDeep,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  bottomArea: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  controls: {
    width: '100%',
    maxWidth: 310,
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 46,
  },
  galleryButton: {
    width: 66,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  controlLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  shutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  retakeControl: {
    width: 66,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retakeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  wildlifeNote: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 4,
  },
  wildlifeText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
});