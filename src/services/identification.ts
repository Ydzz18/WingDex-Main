import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import { birdRegions, type BirdRegion } from '../data/regions';
import type { EbirdSpecies } from './ebird';
import { minimumObservationConfidence } from './observationRules';

export type IdentificationResult = {
  commonName: string | null;
  scientificName: string | null;
  description: string | null;
  confidence: number;
  regions: BirdRegion[];
  ebirdSpecies?: EbirdSpecies | null;
  ebirdLookupError?: string;
};

export const minimumConfidence = minimumObservationConfidence;

const supportedImageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function getImageMimeType(
  mimeType: string | null,
  fileType: string,
  fileName: string,
): string | null {
  const candidates = [mimeType, fileType]
    .map((value) => value?.split(';')[0]?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
  const knownType = candidates.find((candidate) =>
    supportedImageMimeTypes.has(candidate) || candidate === 'image/jpg');
  if (knownType) return knownType === 'image/jpg' ? 'image/jpeg' : knownType;

  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    default:
      return null;
  }
}

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
  const uploadFileName = fileName ?? photoFile.name;
  const uploadMimeType = getImageMimeType(mimeType, photoFile.type, uploadFileName);
  if (!uploadMimeType) {
    throw new Error('This photo format is not supported. Choose a JPEG, PNG, WebP, or HEIC photo.');
  }

  const photoBlob = new Blob([await photoFile.arrayBuffer()], { type: uploadMimeType });
  formData.append('photo', photoBlob, uploadFileName);

  const response = await fetch(`${baseUrl}/identify`, {
    method: 'POST',
    body: formData,
  });

  const responseText = await response.text();
  if (!response.ok) {
    let errorResult: unknown;
    try {
      errorResult = JSON.parse(responseText);
    } catch {
      errorResult = null;
    }
    if (
      typeof errorResult === 'object' &&
      errorResult !== null &&
      'error' in errorResult &&
      typeof errorResult.error === 'string' &&
      errorResult.error.trim()
    ) {
      throw new Error(errorResult.error);
    }
    throw new Error(`Identification failed (HTTP ${response.status}). Please try again later.`);
  }

  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error('The identification service returned an unreadable response.');
  }
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