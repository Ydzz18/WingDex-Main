export type CollectionStorageKeys = {
  savedBirds: string;
  observations: string;
  removedSavedBirds: string;
};

const legacyKeys: CollectionStorageKeys = {
  savedBirds: 'wingdex.collection.v1',
  observations: 'wingdex.observations.v1',
  removedSavedBirds: 'wingdex.collection.removed.v1',
};

export function getCollectionStorageKeys(userId: string | null): CollectionStorageKeys {
  if (!userId) return { ...legacyKeys };
  const suffix = `.user.${encodeURIComponent(userId)}`;
  return {
    savedBirds: `${legacyKeys.savedBirds}${suffix}`,
    observations: `${legacyKeys.observations}${suffix}`,
    removedSavedBirds: `${legacyKeys.removedSavedBirds}${suffix}`,
  };
}
