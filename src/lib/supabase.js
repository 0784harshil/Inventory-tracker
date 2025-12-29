// This file will contain the Supabase configuration
// You will need to create a Supabase project and add these values

/*
To set up Supabase:
1. Go to https://supabase.com and create a free account
2. Create a new project
3. Go to Settings > API to get your URL and anon key
4. Create a .env.local file with:

NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

5. Run the SQL schema from sql/schema.sql in your Supabase SQL Editor
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabaseUrl && supabaseAnonKey;
};
