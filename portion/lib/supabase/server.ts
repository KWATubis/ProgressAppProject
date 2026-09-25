import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookie mutation is a no-op
          }
        },
      },
    }
  );
}

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

/**
 * The signed-in user for this request, or null.
 *
 * Uses `getClaims()`, which verifies the session JWT locally against the
 * project's (cached) ES256 signing keys — `getUser()` was a network round trip
 * to Supabase Auth on every call. `cache` dedupes it across the layouts, page
 * and helpers rendering in the same request.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata ?? {},
  };
});
