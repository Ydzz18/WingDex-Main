import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { birdRegions, type BirdRegion } from '../data/regions';
import type { EbirdSpecies } from './ebird';

export type IdentificationResult = {
  commonName: string | null;
  scientificName: string | null;
  description: string | null;
  confidence: number;
  regions: BirdRegion[];
  ebirdSpecies?: EbirdSpecies | null;
  ebirdLookupError?: string;
};

export const minimumConfidence = 0.68;

export function isIdentificationConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_WINGDEX_API_URL);
}

export async function identifyBird(
  uri: string,
  fileName: string | null,
  mimeType: string | null
): Promise<IdentificationResult> {
  const baseUrl = process.env.EXPO_PUBLIC_WINGDEX_API_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Bird identification is not connected yet.');
  }

  const formData = new FormData();
  const photoFile = new File(uri);
  formData.append('photo', photoFile, fileName ?? photoFile.name);

  const response = await fetch(`${baseUrl}/identify`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Identification could not be completed. Try again later.');
  }

  const result: unknown = await response.json();
  const isBirdRegion = (region: unknown): region is BirdRegion =>
    typeof region === 'string' && birdRegions.some((knownRegion) => knownRegion === region);
  const isEbirdSpecies = (species: unknown): species is EbirdSpecies => {
    if (typeof species !== 'object' || species === null) return false;
    return 'speciesCode' in species && typeof species.speciesCode === 'string'
      && 'comName' in species && typeof species.comName === 'string'
      && 'sciName' in species && typeof species.sciName === 'string'
      && 'category' in species && typeof species.category === 'string'
      && (!('familyCode' in species) || typeof species.familyCode === 'string')
      && (!('familyComName' in species) || typeof species.familyComName === 'string')
      && (!('familySciName' in species) || typeof species.familySciName === 'string')
      && (!('order' in species) || typeof species.order === 'string');
  };

  if (
    typeof result !== 'object' ||
    result === null ||
    !('commonName' in result) ||
    (typeof result.commonName !== 'string' && result.commonName !== null) ||
    !('scientificName' in result) ||
    (typeof result.scientificName !== 'string' && result.scientificName !== null) ||
    !('description' in result) ||
    (typeof result.description !== 'string' && result.description !== null) ||
    !('confidence' in result) ||
    typeof result.confidence !== 'number' ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1 ||
    !('regions' in result) ||
    !Array.isArray(result.regions) ||
    !result.regions.every(isBirdRegion) ||
    ('ebirdSpecies' in result && result.ebirdSpecies !== null && !isEbirdSpecies(result.ebirdSpecies)) ||
    ('ebirdLookupError' in result && typeof result.ebirdLookupError !== 'string')
  ) {
    throw new Error('The identification service returned an invalid result.');
  }

  return {
    commonName: result.commonName,
    scientificName: result.scientificName,
    description: result.description,
    confidence: result.confidence,
    regions: result.regions,
    ...('ebirdSpecies' in result ? { ebirdSpecies: result.ebirdSpecies as EbirdSpecies | null } : {}),
    ...('ebirdLookupError' in result ? { ebirdLookupError: result.ebirdLookupError as string } : {}),
  };
}