import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  addBirdObservation,
  addSavedBird,
  getBirdObservations,
  getSavedBirdIds,
  setCollectionUser,
  toggleSavedBird,
  type BirdObservation,
} from '../services/collection';
import type { IdentificationResult } from '../services/identification';
import type { UserLocation } from '../services/location';
import { syncCollectionForUser } from '../services/collectionSync';
import { supabase } from '../services/supabase';

export function useSavedBirds() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [observations, setObservations] = useState<BirdObservation[]>([]);
  const [storageError, setStorageError] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const collectionUserId = useRef<string | null>(null);

  const sync = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    const queuedSync = syncQueue.current.catch(() => undefined).then(async () => {
      setSyncing(true);
      try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          setSyncError(false);
          return;
        }
        await setCollectionUser(data.session.user.id);
        const snapshot = await syncCollectionForUser(data.session.user.id);
        setSavedIds(snapshot.savedBirdIds);
        setObservations(snapshot.observations);
        setSyncError(false);
      } catch {
        setSyncError(true);
      } finally {
        setSyncing(false);
      }
    });
    syncQueue.current = queuedSync;
    await queuedSync;
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        let userId: string | null = null;
        if (supabase) {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          userId = data.session?.user.id ?? null;
        }
        if (collectionUserId.current !== userId) {
          setSavedIds([]);
          setObservations([]);
          setStorageError(false);
          setSyncError(false);
          collectionUserId.current = userId;
        }
        await setCollectionUser(userId);
        const [ids, savedObservations] = await Promise.all([getSavedBirdIds(), getBirdObservations()]);
        if (active) {
          setSavedIds(ids);
          setObservations(savedObservations);
          setStorageError(false);
          if (userId) void sync();
        }
      })().catch(() => {
        if (active) setStorageError(true);
      });

      return () => {
        active = false;
      };
    }, [sync])
  );

  const toggle = async (id: string) => {
    try {
      setSavedIds(await toggleSavedBird(id));
      setStorageError(false);
      await sync();
    } catch {
      setStorageError(true);
    }
  };

  const add = async (id: string) => {
    try {
      setSavedIds(await addSavedBird(id));
      setStorageError(false);
      await sync();
    } catch {
      setStorageError(true);
    }
  };

  const addObservation = async (
    result: IdentificationResult,
    photoUri: string | null,
    location: UserLocation | null = null,
  ) => {
    try {
      const observation = await addBirdObservation(result, photoUri, location);
      setObservations((current) => [observation, ...current]);
      setStorageError(false);
      await sync();
      return observation;
    } catch (error) {
      setStorageError(true);
      throw error;
    }
  };

  return { savedIds, observations, storageError, syncError, syncing, retrySync: sync, toggle, add, addObservation };
}