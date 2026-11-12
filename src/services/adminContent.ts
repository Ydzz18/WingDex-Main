import { supabase } from './supabase';

export type AppBadge = {
  id: string;
  title: string;
  description: string;
  rule_type: 'unique_species' | 'observations' | 'saved_species';
  threshold: number;
};

export type AppRank = {
  id: string;
  title: string;
  threshold: number;
};

export type AppAnnouncement = {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
};

export async function getPublishedBadges(): Promise<AppBadge[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('badges')
    .select('id,title,description,rule_type,threshold')
    .eq('is_active', true)
    .order('threshold', { ascending: true })
    .limit(200);
  if (error) throw error;
  return data as AppBadge[];
}

export async function getPublishedRanks(): Promise<AppRank[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ranks')
    .select('id,title,threshold')
    .eq('is_published', true)
    .order('threshold', { ascending: true })
    .limit(200);
  if (error) throw error;
  return data as AppRank[];
}

export async function getPublishedAnnouncements(): Promise<AppAnnouncement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('announcements')
    .select('id,title,body,published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as AppAnnouncement[];
}
