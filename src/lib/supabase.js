import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials. Auth features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function getCurrentUser() {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function getUserFullProfile(userId) {
  if (!supabase) return { user: null, policy: null, claims: [] };
  try {
    const [userRes, policyRes, claimsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('policies').select('*').eq('user_id', userId).eq('active', true).single(),
      supabase.from('claims').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    return {
      user: userRes.data,
      policy: policyRes.data,
      claims: claimsRes.data || [],
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return { user: null, policy: null, claims: [] };
  }
}