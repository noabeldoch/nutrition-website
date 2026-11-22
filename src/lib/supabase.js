import { createClient } from '@supabase/supabase-js';

// Cloud sync stays disabled until the Supabase schema and anonymous auth are
// explicitly configured. The app remains fully usable with IndexedDB locally.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const cloudSyncEnabled = import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';

export const supabaseConfigured = Boolean(cloudSyncEnabled && url && key);
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
