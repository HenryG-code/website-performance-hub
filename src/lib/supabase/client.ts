"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Browser Supabase client.
 *
 * `createBrowserClient` memoises internally, so calling this per component is
 * cheap and always yields the same underlying client and auth state.
 *
 * Only ever used for auth calls that must originate in the browser (sign-in,
 * password update) and for subscribing to auth state. All data access goes
 * through server components and server actions, so the anon key never needs
 * more than the privileges Row Level Security grants it.
 */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
