import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://hsqsskxwtknmuehrldlf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcXNza3h3dGtubXVlaHJsZGxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDI5MjIsImV4cCI6MjA4MzU3ODkyMn0.Zxpp0E0xcad5VLBSAJVNZw4Va6XIV-RNy9tL372FrBE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
