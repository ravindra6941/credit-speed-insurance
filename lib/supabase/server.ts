import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (use in Server Components / Route Handlers / Server Actions).
 *
 * NOTE: Async since Next.js 15 — `cookies()` returns a Promise. All callers
 * must `await createClient()`.
 */
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
            // Server Components can't set cookies — this is fine when called from a
            // Server Component. Middleware handles cookie refresh in that case.
          }
        },
      },
    }
  );
}
