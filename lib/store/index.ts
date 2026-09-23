import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as fileStore from "./file-store";
import * as supabaseStore from "./supabase-store";

export function getStore() {
  return isSupabaseConfigured() ? supabaseStore : fileStore;
}
