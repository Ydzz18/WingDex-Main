import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { BirdRegion } from '../data/regions';
import type { IdentificationResult } from './identification';
import type { UserLocation } from './location';
import { getCollectionStorageKeys } from './collectionKeys';

const COLLECTION_OWNER_KEY = 'wingdex.collection.owner.v1';
let activeCollectionUserId: string | null = null;

export function currentCollectionStorageKeys(userId?: string | null) {
  return getCollectionStorageKeys(userId === undefined ? activeCollectionUserId : userId);
}

export async function setCollectionUser(userId: string | null): Promise<void> {
  const nextUserId = userId?.trim() || null;
  if (nextUserId === activeCollectionUserId) return;
  if (!nextUserId) {
    activeCollectionUserId = null;
    return;
  }

  activeCollectionUserId = nextUserId;
  const ownerId = await AsyncStorage.getItem(COLLECTION_OWNER_KEY);
  if (!ownerId || ownerId === nextUserId) {
    const legacy = getCollectionStorageKeys(null);
    const scoped = getCollectionStorageKeys(nextUserId);
    for (const key of Object.keys(legacy) as (keyof typeof legacy)[]) {
      if (await AsyncStorage.getItem(scoped[key]) !== null) continue;
      const previousValue = await AsyncStorage.getItem(legacy[key]);
      if (previousValue !== null) await AsyncStorage.setItem(scoped[key], previousValue);
    }
    if (!ownerId) await AsyncStorage.setItem(COLLECTION_OWNER_KEY, nextUserId);
  }
}

export type BirdObservation = IdentificationResult & {
  id: string;
  identifiedAt: string;
  photoUri: string | null;
  location: UserLocation | null;
};

export async function getSavedBirdIds(userId?: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(currentCollectionStorageKeys(userId).savedBirds);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function toggleSavedBird(id: string): Promise<string[]> {
  const current = await getSavedBirdIds();
  const next = current.includes(id)
    ? current.filter((savedId) => savedId !== id)
    : [...current, id];

  await AsyncStorage.setItem(currentCollectionStorageKeys().savedBirds, JSON.stringify(next));
  const removed = await getRemovedSavedBirdIds();
  const nextRemoved = current.includes(id)
    ? [...new Set([...removed, id])]
    : removed.filter((removedId) => removedId !== id);
  await AsyncStorage.setItem(currentCollectionStorageKeys().removedSavedBirds, JSON.stringify(nextRemoved));
  return next;
}

export async function addSavedBird(id: string): Promise<string[]> {
  const current = await getSavedBirdIds();
  if (current.includes(id)) return current;

  const next = [...current, id];
  await AsyncStorage.setItem(currentCollectionStorageKeys().savedBirds, JSON.stringify(next));
  const removed = await getRemovedSavedBirdIds();
  if (removed.includes(id)) {
    await AsyncStorage.setItem(
      currentCollectionStorageKeys().removedSavedBirds,
      JSON.stringify(removed.filter((removedId) => removedId !== id)),
    );
  }
  return next;
}

export async function getRemovedSavedBirdIds(userId?: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(currentCollectionStorageKeys(userId).removedSavedBirds);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function clearRemovedSavedBirdIds(ids: string[], userId?: string): Promise<void> {
  const removed = await getRemovedSavedBirdIds(userId);
  const completed = new Set(ids);
  await AsyncStorage.setItem(
    currentCollectionStorageKeys(userId).removedSavedBirds,
    JSON.stringify(removed.filter((id) => !completed.has(id))),
  );
}

export async function getBirdObservations(userId?: string): Promise<BirdObservation[]> {
  const stored = await AsyncStorage.getItem(currentCollectionStorageKeys(userId).observations);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter(isBirdObservation).map((observation) => ({
          ...observation,
          description: observation.description ?? null,
          location: observation.location ?? null,
        }))
      : [];
  } catch {
    return [];
  }
}

export async function addBirdObservation(
  result: IdentificationResult,
  selectedPhotoUri: string | null,
  location: UserLocation | null = null,
): Promise<BirdObservation> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const identified = Boolean(result.commonName && result.scientificName && result.confidence >= 0.68);
  let photoUri: string | null = null;

  if (identified && selectedPhotoUri) {
    const source = new File(selectedPhotoUri);
    const directory = new Directory(Paths.document, 'bird-observations');
    directory.create({ idempotent: true, intermediates: true });
    const extension = source.extension || '.jpg';
    const destination = new File(directory, `${id}${extension}`);
    await source.copy(destination);
    photoUri = destination.uri;
  }

  const observation: BirdObservation = {
    id,
    commonName: identified ? result.commonName : null,
    scientificName: identified ? result.scientificName : null,
    description: identified ? result.description : null,
    confidence: identified ? result.confidence : 0,
    regions: identified && result.regions.length > 0 ? result.regions : ['Unknown'],
    identifiedAt: new Date().toISOString(),
    photoUri,
    location,
    ...(identified && result.ebirdSpecies ? { ebirdSpecies: result.ebirdSpecies } : {}),
    ...(identified && result.ebirdLookupError ? { ebirdLookupError: result.ebirdLookupError } : {}),
  };
  const observations = await getBirdObservations();
  await AsyncStorage.setItem(currentCollectionStorageKeys().observations, JSON.stringify([observation, ...observations]));
  return observation;
}

function isBirdObservation(value: unknown): value is BirdObservation {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('identifiedAt' in value) || typeof value.identifiedAt !== 'string') return false;
  if (!('confidence' in value) || typeof value.confidence !== 'number') return false;
  if (!('commonName' in value) || (typeof value.commonName !== 'string' && value.commonName !== null)) return false;
  if (!('scientificName' in value) || (typeof value.scientificName !== 'string' && value.scientificName !== null)) return false;
  if ('description' in value && typeof value.description !== 'string' && value.description !== null) return false;
  if (!('photoUri' in value) || (typeof value.photoUri !== 'string' && value.photoUri !== null)) return false;
  if (!('regions' in value) || !Array.isArray(value.regions)) return false;
  if ('location' in value && value.location !== null && !isUserLocation(value.location)) return false;
  if ('ebirdLookupError' in value && typeof value.ebirdLookupError !== 'string') return false;
  if ('ebirdSpecies' in value && value.ebirdSpecies !== null && !isEbirdSpecies(value.ebirdSpecies)) return false;

  const regions: BirdRegion[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica', 'Unknown'];
  return value.regions.every((region) => typeof region === 'string' && regions.includes(region as BirdRegion));
}

function isEbirdSpecies(value: unknown): value is NonNullable<IdentificationResult['ebirdSpecies']> {
  if (typeof value !== 'object' || value === null) return false;
  return 'speciesCode' in value && typeof value.speciesCode === 'string'
    && 'comName' in value && typeof value.comName === 'string'
    && 'sciName' in value && typeof value.sciName === 'string'
    && 'category' in value && typeof value.category === 'string'
    && (!('familyCode' in value) || typeof value.familyCode === 'string')
    && (!('familyComName' in value) || typeof value.familyComName === 'string')
    && (!('familySciName' in value) || typeof value.familySciName === 'string')
    && (!('order' in value) || typeof value.order === 'string');
}

function isUserLocation(value: unknown): value is UserLocation {
  if (typeof value !== 'object' || value === null) return false;
  if (!('latitude' in value) || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude)) return false;
  if (!('longitude' in value) || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude)) return false;
  return value.latitude >= -90 && value.latitude <= 90 && value.longitude >= -180 && value.longitude <= 180;
}