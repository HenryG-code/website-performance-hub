import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Server Supabase client, bound to the request's cookies.
 *
 * `server-only` at the top of this module makes importing it from a client
 * component a build error, which keeps the cookie-writing client off the
 * browser bundle entirely.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the middleware
          // refreshes the session on every request, so the tokens stay current.
        }
      },
    },
  });
}

/**
 * Returns the verified signed-in user, or null.
 *
 * Always uses `getUser()`, never `getSession()`. `getSession()` reads the JWT
 * straight out of the cookie without checking it, so a forged cookie would look
 * like a valid session; `getUser()` revalidates the token with the auth server.
 * Anything that gates access must use this.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}
