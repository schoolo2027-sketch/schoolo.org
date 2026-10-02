import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  'https://tyitzbbzzzzasdsvxjdq.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aXR6YmJ6enp6YXNkc3Z4amRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTcxMzksImV4cCI6MjEwMzU5MzEzOX0.dciVlBjGveTlW4m-E46Zqzgzbp5s1l1m08T_V0xwbVI';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[Schoolo.org] Supabase configuration is missing. Please provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file.'
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);