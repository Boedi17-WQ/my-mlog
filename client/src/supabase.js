import { createClient } from '@supabase/supabase-js';

// Gunakan import.meta.env untuk Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase config:', {
    url: import.meta.env.VITE_SUPABASE_URL,
    key: import.meta.env.VITE_SUPABASE_KEY ? '***' : 'MISSING'
  });
  throw new Error(`
    Supabase configuration missing. Please check:
    1. File .env exists in project root
    2. Contains VITE_SUPABASE_URL and VITE_SUPABASE_KEY
    3. Variables are prefixed with VITE_
    4. Server has been restarted
  `);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});