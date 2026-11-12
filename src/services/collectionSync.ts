import {
  clearRemovedSavedBirdIds,
  getBirdObservations,
  getRemovedSavedBirdIds,
  getSavedBirdIds,
} from './collection';
import { supabase } from './supabase';
import type { RemoteObservation } from './collectionSyncData';
import { syncCollectionSnapshot } from './collectionSyncEngine';
import { saveCollectionSnapshot } from './collectionSyncStorage';

export type CollectionSyncResult = {
  savedBirdIds: string[];
  observations: Awaited<ReturnType<typeof getBirdObservations>>;
};

export async function syncCollectionForUser(userId: string): Promise<CollectionSyncResult> {
  const client = supabase;
  if (!client) throw new Error('Cloud sync is not configured.');

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session || sessionData.session.user.id !== userId) {
    throw new Error('Sign in again to sync this collection.');
  }

  const [localSavedIds, localObservations, removedIds] = await Promise.all([
    getSavedBirdIds(userId),
    getBirdObservations(userId),
    getRemovedSavedBirdIds(userId),
  ]);
  return syncCollectionSnapshot(userId, localSavedIds, localObservations, removedIds, {
    async removeSavedBirds(ownerId, ids) {
      const { error } = await client.from('saved_birds').delete().eq('user_id', ownerId).in('bird_id', ids);
      if (error) throw error;
    },
    async upsertSavedBirds(ownerId, ids) {
      const rows = ids.map((birdId) => ({ user_id: ownerId, bird_id: birdId }));
      const { error } = await client
        .from('saved_birds')
        .upsert(rows, { onConflict: 'user_id,bird_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    async upsertObservations(ownerId, items) {
      const rows = items.map((observation) => ({
        user_id: ownerId,
        client_id: observation.id,
        common_name: observation.commonName,
        scientific_name: observation.scientificName,
        description: observation.description,
        confidence: observation.confidence,
        regions: observation.regions,
        identified_at: observation.identifiedAt,
        latitude: observation.location?.latitude ?? null,
        longitude: observation.location?.longitude ?? null,
        ebird_species: observation.ebirdSpecies ?? null,
      }));
      const { error } = await client
        .from('observations')
        .upsert(rows, { onConflict: 'user_id,client_id' });
      if (error) throw error;
    },
    loadSavedBirdIds: fetchRemoteSavedBirdIds,
    loadObservations: fetchRemoteObservations,
    saveLocalSnapshot: saveCollectionSnapshot,
    clearRemovedSavedBirdIds: (ownerId, ids) => clearRemovedSavedBirdIds(ids, ownerId),
  });
}

async function fetchRemoteSavedBirdIds(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const result: string[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('saved_birds')
      .select('bird_id')
      .eq('user_id', userId)
      .order('bird_id', { ascending: true })
      .range(offset, offset + 499);
    if (error) throw error;
    const rows = data ?? [];
    result.push(...rows.map((row) => row.bird_id));
    if (rows.length < 500) return result;
  }
}

async function fetchRemoteObservations(userId: string): Promise<RemoteObservation[]> {
  if (!supabase) return [];
  const result: RemoteObservation[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('observations')
      .select('client_id,common_name,scientific_name,description,confidence,regions,identified_at,latitude,longitude,ebird_species')
      .eq('user_id', userId)
      .order('client_id', { ascending: true })
      .range(offset, offset + 499);
    if (error) throw error;
    const rows = (data ?? []) as RemoteObservation[];
    result.push(...rows);
    if (rows.length < 500) return result;
  }
}
