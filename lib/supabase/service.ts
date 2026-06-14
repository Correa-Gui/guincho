import { createClient } from "@supabase/supabase-js";

/**
 * Client com a service role key — bypassa RLS. Uso restrito a contextos
 * sem sessão de usuário (ex: webhook da Evolution API), nunca no browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_URL não configurados.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
