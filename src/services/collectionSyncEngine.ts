import type { BirdObservation } from './collection';
import { mergeObservations, mergeSavedBirdIds, type RemoteObservation } from './collectionSyncData';

export type CollectionSyncAdapter = {
  removeSavedBirds(userId: string, ids: string[]): Promise<void>;
  upsertSavedBirds(userId: string, ids: string[]): Promise<void>;
  upsertObservations(userId: string, observations: BirdObservation[]): Promise<void>;
  loadSavedBirdIds(userId: string): Promise<string[]>;
  loadObservations(userId: string): Promise<RemoteObservation[]>;
  saveLocalSnapshot(userId: string, savedBirdIds: string[], observations: BirdObservation[]): Promise<void>;
  clearRemovedSavedBirdIds(userId: string, ids: string[]): Promise<void>;
};

export async function syncCollectionSnapshot(
  userId: string,
  localSavedIds: string[],
  localObservations: BirdObservation[],
  removedIds: string[],
  adapter: CollectionSyncAdapter,
) {
  const removed = new Set(removedIds);

  for (let offset = 0; offset < removedIds.length; offset += 100) {
    await adapter.removeSavedBirds(userId, removedIds.slice(offset, offset + 100));
  }
  const savedBirdIdsToUpload = localSavedIds.filter((id) => !removed.has(id));
  for (let offset = 0; offset < savedBirdIdsToUpload.length; offset += 100) {
    await adapter.upsertSavedBirds(userId, savedBirdIdsToUpload.slice(offset, offset + 100));
  }
  for (let offset = 0; offset < localObservations.length; offset += 100) {
    await adapter.upsertObservations(userId, localObservations.slice(offset, offset + 100));
  }

  const [remoteSavedIds, remoteObservations] = await Promise.all([
    adapter.loadSavedBirdIds(userId),
    adapter.loadObservations(userId),
  ]);
  const savedBirdIds = mergeSavedBirdIds(localSavedIds, remoteSavedIds, removedIds);
  const observations = mergeObservations(localObservations, remoteObservations);

  await adapter.saveLocalSnapshot(userId, savedBirdIds, observations);
  await adapter.clearRemovedSavedBirdIds(userId, removedIds);
  return { savedBirdIds, observations };
}
