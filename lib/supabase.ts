import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://uouxjtnsggzayzkbtgpv.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "sb_publishable_uNZLVzyNW4ncE6xTVCA9HQ_0WyZE4Us";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
