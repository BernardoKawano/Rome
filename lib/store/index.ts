import { StoreError } from "@/lib/store-error";
import { isFileStoreAllowed, isSupabaseConfigured } from "@/lib/supabase/env";
import * as fileStore from "./file-store";
import * as supabaseStore from "./supabase-store";

const PRODUCTION_STORE_REQUIRED =
  "Em produção configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (o disco da Vercel não guarda dados).";

export function getStore() {
  if (isSupabaseConfigured()) return supabaseStore;
  if (!isFileStoreAllowed()) {
    throw new StoreError(PRODUCTION_STORE_REQUIRED, 503);
  }
  return fileStore;
}
