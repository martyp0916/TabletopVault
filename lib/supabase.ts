/**
 * Supabase Client Configuration
 *
 * SECURITY: API keys are loaded from environment variables.
 * Never hardcode secrets in source code.
 *
 * Note: The Supabase anon key is designed to be public (client-side).
 * It only has access to what Row Level Security (RLS) policies allow.
 * The service_role key should NEVER be used client-side.
 */
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SECURITY: Load from environment variables
// In Expo, use EXPO_PUBLIC_ prefix for client-accessible variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'See .env.example for reference.'
  );
}

// Validate URL format to prevent misconfiguration
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  throw new Error('Invalid EXPO_PUBLIC_SUPABASE_URL format. Must be a valid Supabase URL.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
