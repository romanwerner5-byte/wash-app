import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error("Server Supabase env vars are missing. Check .env.local.");
}

export const serverSupabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});
