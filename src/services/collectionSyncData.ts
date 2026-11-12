import type { BirdObservation } from './collection';
import type { EbirdSpecies } from './ebird';

export type RemoteObservation = {
  client_id: string;
  common_name: string | null;
  scientific_name: string | null;
  description: string | null;
  confidence: number;
  regions: string[];
  identified_at: string;
  latitude: number | null;
  longitude: number | null;
  ebird_species: EbirdSpecies | null;
};

export function mergeSavedBirdIds(
  localIds: string[],
  remoteIds: string[],
  removedIds: string[],
): string[] {
  const removed = new Set(removedIds);
  return [...new Set([...localIds, ...remoteIds])].filter((id) => !removed.has(id));
}

export function mergeObservations(
  localObservations: BirdObservation[],
  remoteObservations: RemoteObservation[],
): BirdObservation[] {
  const byClientId = new Map(localObservations.map((observation) => [observation.id, observation]));
  const merged = new Map(byClientId);

  for (const remote of remoteObservations) {
    if (merged.has(remote.client_id)) continue;
    merged.set(remote.client_id, {
      id: remote.client_id,
      commonName: remote.common_name,
      scientificName: remote.scientific_name,
      description: remote.description,
      confidence: remote.confidence,
      regions: remote.regions as BirdObservation['regions'],
      identifiedAt: remote.identified_at,
      photoUri: null,
      location: remote.latitude === null || remote.longitude === null
        ? null
        : { latitude: remote.latitude, longitude: remote.longitude },
      ebirdSpecies: remote.ebird_species,
    });
  }

  return [...merged.values()].sort(
    (first, second) => Date.parse(second.identifiedAt) - Date.parse(first.identifiedAt),
  );
}
