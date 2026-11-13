import { supabase } from './supabase';
import type { PhilippineRegionCode } from '../data/philippineRegions';

export type AgeStatus = 'missing' | 'under_13' | 'minor_provider_required' | 'adult';

export type LicenseAccessState = {
  age_status: AgeStatus;
  is_adult: boolean;
  profile_complete: boolean;
  license_number: string | null;
};

export type BirdingLicenseProfile = {
  id: string;
  username: string;
  display_name: string;
  country: string;
  city: string | null;
  bio: string | null;
  home_region_code: PhilippineRegionCode;
  home_region_name: string;
  favorite_bird: string | null;
  preferred_categories: string[];
  interests: string[];
  preferred_discovery_region: string | null;
  avatar_path: string | null;
  license_number: string;
  license_issued_at: string;
};

export type PublicBirdingLicense = {
  license_number: string;
  username: string;
  display_name: string;
  bio: string | null;
  country: string;
  city: string | null;
  home_region_code: PhilippineRegionCode | null;
  home_region_name: string | null;
  favorite_bird: string | null;
  preferred_categories: string[];
  interests: string[];
  preferred_discovery_region: string | null;
  license_issued_at: string;
  species_count: number;
  earned_badges: { rank_code: string; rank_title: string; unlocked_at: string }[];
};

export function getSelfReportedAge(birthDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const date = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - date.getUTCFullYear();
  if (today.getUTCMonth() < date.getUTCMonth()
    || (today.getUTCMonth() === date.getUTCMonth() && today.getUTCDate() < date.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}

const accessListeners = new Set<() => void>();

export function subscribeToLicenseAccess(callback: () => void) {
  accessListeners.add(callback);
  return () => accessListeners.delete(callback);
}

export function notifyLicenseAccessChanged() {
  accessListeners.forEach((callback) => callback());
}

export async function getLicenseAccessState(): Promise<LicenseAccessState> {
  if (!supabase) throw new Error('Wingdex account sync is unavailable.');
  const { data, error } = await supabase.rpc('my_license_access_state');
  if (error) throw error;
  if (!data || typeof data !== 'object') throw new Error('Your account access status could not be verified.');
  const value = data as Record<string, unknown>;
  const status = value.age_status;
  if (status !== 'missing' && status !== 'under_13'
    && status !== 'minor_provider_required' && status !== 'adult') {
    throw new Error('Your account access status could not be verified.');
  }
  return {
    age_status: status,
    is_adult: value.is_adult === true,
    profile_complete: value.profile_complete === true,
    license_number: typeof value.license_number === 'string' ? value.license_number : null,
  };
}

export async function submitPrivateBirthDate(birthDate: string): Promise<AgeStatus> {
  if (!supabase) throw new Error('Wingdex account sync is unavailable.');
  const { data, error } = await supabase.rpc('submit_private_birth_date', { p_birth_date: birthDate });
  if (error) throw error;
  if (data !== 'under_13' && data !== 'minor_provider_required' && data !== 'adult') {
    throw new Error('Your age could not be confirmed.');
  }
  notifyLicenseAccessChanged();
  return data;
}

export async function getBirdingLicenseProfile(): Promise<BirdingLicenseProfile> {
  if (!supabase) throw new Error('Wingdex account sync is unavailable.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sign in again to open your license.');
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,country,city,bio,home_region_code,home_region_name,favorite_bird,preferred_categories,interests,preferred_discovery_region,avatar_path,license_number,license_issued_at')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!data?.license_number || !data.license_issued_at || !data.home_region_code) {
    throw new Error('Your Birding License is still being prepared.');
  }
  return data as unknown as BirdingLicenseProfile;
}

export async function saveBirdingLicenseProfile(input: {
  username: string;
  displayName: string;
  country: string;
  city: string;
  bio: string;
  homeRegionCode: PhilippineRegionCode;
  homeRegionName: string;
  favoriteBird: string;
  preferredCategories: string[];
  interests: string[];
  preferredDiscoveryRegion: string;
}) {
  if (!supabase) throw new Error('Wingdex account sync is unavailable.');
  const { data, error } = await supabase.rpc('complete_birding_license_profile', {
    p_username: input.username,
    p_display_name: input.displayName,
    p_country: input.country,
    p_city: input.city,
    p_bio: input.bio,
    p_home_region_code: input.homeRegionCode,
    p_home_region_name: input.homeRegionName,
    p_favorite_bird: input.favoriteBird,
    p_preferred_categories: input.preferredCategories,
    p_interests: input.interests,
    p_preferred_discovery_region: input.preferredDiscoveryRegion,
    p_sharing_enabled: true,
  });
  if (error?.code === '23505') {
    throw new Error('That username is already in use. Choose another username.');
  }
  if (error?.code === 'PGRST202') {
    throw new Error('The license service is out of date. Apply the latest Wingdex license migrations and try again.');
  }
  if (error) throw error;
  notifyLicenseAccessChanged();
  return data as { license_number: string };
}

type ProfilePhotoMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

const profilePhotoExtensions: Record<ProfilePhotoMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function normalizeProfilePhotoMimeType(mimeType: string | null | undefined): ProfilePhotoMimeType | null {
  const normalized = mimeType?.split(';')[0]?.trim().toLowerCase();
  if (normalized === 'image/jpg') return 'image/jpeg';
  return normalized === 'image/jpeg' || normalized === 'image/png' || normalized === 'image/webp'
    ? normalized
    : null;
}

function profilePhotoMimeType(
  candidates: (string | null | undefined)[],
  fileName: string | null | undefined,
  uri: string,
): ProfilePhotoMimeType {
  for (const candidate of candidates) {
    const mimeType = normalizeProfilePhotoMimeType(candidate);
    if (mimeType) return mimeType;
  }

  const sourceNames = [fileName, uri.split(/[?#]/, 1)[0]];
  for (const sourceName of sourceNames) {
    const extension = sourceName?.split('.').pop()?.toLowerCase();
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
  }
  throw new Error('Choose a JPEG, PNG, or WebP image for your profile photo.');
}

export async function uploadProfilePhoto(
  uri: string,
  mimeType?: string | null,
  fileName?: string | null,
): Promise<string> {
  if (!supabase) throw new Error('Wingdex account sync is unavailable.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sign in again before adding a profile photo.');
  const response = await fetch(uri);
  const photo = await response.blob();
  const contentType = profilePhotoMimeType([mimeType, photo.type], fileName, uri);
  const path = `${userId}/${Date.now()}.${profilePhotoExtensions[contentType]}`;
  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(path, photo, { contentType, upsert: false });
  if (uploadError) throw uploadError;
  const { error: updateError } = await supabase.from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId);
  if (updateError) {
    await supabase.storage.from('profile-photos').remove([path]).catch(() => undefined);
    throw updateError;
  }
  const { data, error } = await supabase.storage.from('profile-photos').createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function getProfilePhotoUrl(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from('profile-photos').createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

export async function getPublicBirdingLicense(licenseNumber: string): Promise<PublicBirdingLicense | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('public_birding_license', { p_license_number: licenseNumber });
  if (error) throw error;
  return data && typeof data === 'object' ? data as PublicBirdingLicense : null;
}

export function getPublicLicenseUrl(licenseNumber: string) {
  const configuredOrigin = process.env.EXPO_PUBLIC_WINGDEX_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (!configuredOrigin) return null;
  try {
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== 'https:' || !origin.hostname || origin.username || origin.password
      || origin.pathname !== '/' || origin.search || origin.hash) return null;
    return new URL(`/license/${encodeURIComponent(licenseNumber)}`, origin.origin).toString();
  } catch {
    return null;
  }
}
