import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BirdObservation } from './collection';
import { getCollectionStorageKeys } from './collectionKeys';

export async function saveCollectionSnapshot(
  userId: string,
  savedBirdIds: string[],
  observations: BirdObservation[],
): Promise<void> {
  const keys = getCollectionStorageKeys(userId);
  await Promise.all([
    AsyncStorage.setItem(keys.savedBirds, JSON.stringify(savedBirdIds)),
    AsyncStorage.setItem(keys.observations, JSON.stringify(observations)),
  ]);
}
