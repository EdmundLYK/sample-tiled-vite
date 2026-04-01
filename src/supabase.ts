import { createClient, SupabaseClient } from '@supabase/supabase-js';

// @ts-expect-error Vite injects import.meta.env at runtime in this app.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// @ts-expect-error Vite injects import.meta.env at runtime in this app.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
