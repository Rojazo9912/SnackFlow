import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the Supabase client instance (singleton pattern)
 * This prevents multiple GoTrueClient instances from being created
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseInstance) {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error('Missing Supabase environment variables');
        }

        supabaseInstance = createClient(url, key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
            },
        });
    }

    return supabaseInstance;
}

// Export the client for convenience
export const supabase = getSupabaseClient();
