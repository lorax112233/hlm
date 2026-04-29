import { createClient } from "@supabase/supabase-js";

// Public Supabase values are injected by Next.js at build/runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast so deployment misconfiguration is visible immediately.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

// Single shared browser client used across the app.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

