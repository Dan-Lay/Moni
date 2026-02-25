import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  _client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("[Moni] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados — modo mock ativo.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient = _client ?? (null as any);
