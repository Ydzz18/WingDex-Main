import AsyncStorage from '@react-native-async-storage/async-storage';

export const RECOVERY_PENDING_KEY = 'wingdex.auth.recovery-pending';

let recoveryActive = false;
const listeners = new Set<(active: boolean) => void>();

function updateRecoveryState(active: boolean) {
  recoveryActive = active;
  listeners.forEach((listener) => listener(active));
}

export function isAuthRecoveryActive() {
  return recoveryActive;
}

export async function restoreAuthRecoveryState() {
  const active = (await AsyncStorage.getItem(RECOVERY_PENDING_KEY)) === 'true';
  updateRecoveryState(active);
  return active;
}

export async function getAuthRecoveryPending() {
  if (recoveryActive) return true;
  const active = (await AsyncStorage.getItem(RECOVERY_PENDING_KEY)) === 'true';
  if (active) updateRecoveryState(true);
  return active;
}

export async function setAuthRecoveryActive(active: boolean) {
  updateRecoveryState(active);
  try {
    if (active) await AsyncStorage.setItem(RECOVERY_PENDING_KEY, 'true');
    else await AsyncStorage.removeItem(RECOVERY_PENDING_KEY);
  } catch {
    // Keep recovery routing usable even if local persistence is unavailable.
  }
}

export function subscribeToAuthRecovery(listener: (active: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
