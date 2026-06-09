import { createClient } from './supabase/client';

export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}
