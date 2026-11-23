// Client Supabase per il browser (prima generato da Lovable, ora gestito a mano).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://zakosqwxfjhnsrcywcjr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nax_OCQVRuydKJ0RWkqrvA_MKDUn8zs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window === "undefined" ? undefined : localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
