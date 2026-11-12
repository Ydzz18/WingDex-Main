import type { UserLocation } from './location';

export type EbirdSpecies = {
  speciesCode: string;
  comName: string;
  sciName: string;
  category: string;
  familyCode?: string;
  familyComName?: string;
  familySciName?: string;
  order?: string;
};

export type EbirdObservation = {
  speciesCode: string;
  comName: string;
  sciName: string;
  obsDt: string;
  lat: number;
  lng: number;
  locId?: string;
  locName?: string;
  howMany?: number;
  subId?: string;
};

export type EbirdHotspot = {
  locId: string;
  name: string;
  lat: number;
  lng: number;
  countryCode?: string;
  subnational1Code?: string;
  latestObsDt?: string;
  numSpeciesAllTime?: number;
};

export type EbirdChecklist = {
  subId: string;
  locId: string;
  locName?: string;
  obsDt: string;
  numSpecies?: number;
  userDisplayName?: string;
};

function getApiBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_WINGDEX_API_URL?.replace(/\/+$/, '');
  if (!baseUrl) throw new Error('eBird data is not connected. Configure the Wingdex backend URL.');
  return baseUrl;
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`);
  } catch {
    throw new Error('The Wingdex backend could not be reached. Check the API URL and server status.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      && typeof payload.error === 'string'
      ? payload.error
      : 'Could not load eBird data. Please try again.';
    throw new Error(message);
  }
  return payload as T;
}

function locationParams(location: UserLocation, distanceKm = 25) {
  const coarseLatitude = Math.round(location.latitude * 100) / 100;
  const coarseLongitude = Math.round(location.longitude * 100) / 100;
  return `lat=${encodeURIComponent(String(coarseLatitude))}`
    + `&lng=${encodeURIComponent(String(coarseLongitude))}`
    + `&dist=${encodeURIComponent(String(distanceKm))}`;
}

export function searchEbirdSpecies(query: string, limit = 30): Promise<EbirdSpecies[]> {
  return getJson(`/ebird/taxonomy?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export function getEbirdSpecies(speciesCode: string): Promise<EbirdSpecies> {
  return getJson(`/ebird/species/${encodeURIComponent(speciesCode)}`);
}

export function getNearbyEbirdObservations(
  location: UserLocation,
  distanceKm = 25,
): Promise<EbirdObservation[]> {
  return getJson(`/ebird/observations/nearby?${locationParams(location, distanceKm)}&back=14&maxResults=50`);
}

export function getNearbyEbirdHotspots(
  location: UserLocation,
  distanceKm = 25,
): Promise<EbirdHotspot[]> {
  return getJson(`/ebird/hotspots/nearby?${locationParams(location, distanceKm)}`);
}

export function getRegionalEbirdObservations(
  regionCode: string,
  maxResults = 50,
): Promise<EbirdObservation[]> {
  return getJson(
    `/ebird/observations/${encodeURIComponent(regionCode)}/recent?back=14&maxResults=${maxResults}`,
  );
}

export function getEbirdChecklists(regionCode: string, date: string): Promise<EbirdChecklist[]> {
  return getJson(`/ebird/checklists/${encodeURIComponent(regionCode)}/${encodeURIComponent(date)}`);
}

export function getEbirdSpeciesObservations(
  speciesCode: string,
  location: UserLocation,
): Promise<EbirdObservation[]> {
  return getJson(`/ebird/species/${encodeURIComponent(speciesCode)}/observations?${locationParams(location)}`);
}

export function getMacaulayAudioSearchUrl(speciesCode: string): string {
  const params = new URLSearchParams({ taxonCode: speciesCode, mediaType: 'audio' });
  return `https://search.macaulaylibrary.org/catalog?${params.toString()}`;
}

export function getMacaulayAudioNameSearchUrl(commonName: string): string {
  const params = new URLSearchParams({ search: commonName, mediaType: 'audio' });
  return `https://search.macaulaylibrary.org/catalog?${params.toString()}`;
}
