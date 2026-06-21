/**
 * GET /api/health — uptime + DB-connectivity probe for an external monitor.
 * 200 only if the database is reachable, 503 otherwise. No auth.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "error" | "unconfigured" = "unconfigured";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    if (url && key) {
      const c = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await c
        .from("plans")
        .select("id", { head: true, count: "exact" })
        .limit(1);
      db = error ? "error" : "ok";
    }
  } catch {
    db = "error";
  }
  const ok = db === "ok";
  return NextResponse.json(
    { ok, db, ts: new Date().toISOString() },
    { status: ok ? 200 : 503 }
  );
}
