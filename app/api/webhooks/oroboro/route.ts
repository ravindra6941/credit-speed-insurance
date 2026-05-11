/**
 * POST /api/webhooks/oroboro
 *
 * Called by Oroboro after a loan is approved on their side. We:
 *   1. Authenticate via bearer token (shared secret env var)
 *   2. Validate the payload shape
 *   3. Look up the plan + retailer by code/name (server-side Supabase)
 *   4. Insert (or upsert by external_loan_id) the customer row
 *   5. Build the warranty PDF
 *   6. Return the PDF as base64 + the customer record so Oroboro can
 *      attach the warranty PDF to the loan agreement on their end.
 *
 * Tomorrow (with Director): add Resend integration so we also push the
 * PDF to a configurable inbox + WhatsApp it to the customer.
 *
 * Contract / shape lives in supabase/oroboro-webhook-contract.md — share
 * that with Oroboro's tech team to align before going live.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { buildWarrantyDoc, warrantyPdfFilename } from "@/lib/pdf/warranty";
import type { CustomerWithRelations, Plan, Retailer } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OroboroLoanPayload = {
  /** Oroboro's internal loan/file id — used as our idempotency key. */
  external_loan_id: string;
  /** Customer */
  customer: {
    name: string;
    mobile: string;
    email?: string;
    city?: string;
    state?: string;
    pin_code?: string;
    address?: string;
  };
  /** Product (the phone) */
  product: {
    brand: string;
    model: string;
    imei_serial: string;        // 15 digits
    imei2_serial?: string;
    value: number;              // ₹ — full product price
  };
  /** Plan — either by type, name, or our plan_id */
  plan: {
    name?: string;              // e.g. "EXTENDED WARRANTY"
    type?: Plan["type"];
    plan_id?: number;
  };
  /** Retailer — by retailer_code (CSINS-Rxxxx) preferably */
  retailer: {
    retailer_code?: string;
    shop_name?: string;
  };
  /** When the warranty starts. Defaults to today if omitted. */
  warranty_start?: string;      // ISO date
};

function bad(reason: string, status = 400) {
  return NextResponse.json({ ok: false, error: reason }, { status });
}

export async function POST(req: NextRequest) {
  // ─── 1. Authenticate ───────────────────────────────────────────────
  const expected = process.env.OROBORO_WEBHOOK_TOKEN;
  if (!expected) {
    return bad(
      "Server misconfigured — OROBORO_WEBHOOK_TOKEN not set in env",
      500
    );
  }
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  if (token !== expected) {
    return bad("Unauthorized", 401);
  }

  // ─── 2. Parse + validate payload ──────────────────────────────────
  let payload: OroboroLoanPayload;
  try {
    payload = (await req.json()) as OroboroLoanPayload;
  } catch {
    return bad("Invalid JSON body");
  }

  const { external_loan_id, customer, product, plan, retailer } = payload;
  if (!external_loan_id) return bad("external_loan_id is required");
  if (!customer?.name || !customer?.mobile)
    return bad("customer.name and customer.mobile are required");
  if (!product?.brand || !product?.model || !product?.imei_serial)
    return bad("product.brand, model, and imei_serial are required");
  if (!/^\d{15}$/.test(product.imei_serial))
    return bad("product.imei_serial must be 15 digits");
  if (product.imei2_serial && !/^\d{15}$/.test(product.imei2_serial))
    return bad("product.imei2_serial must be 15 digits if provided");
  if (!product.value || product.value <= 0)
    return bad("product.value must be > 0");
  if (!/^\d{10}$/.test(customer.mobile))
    return bad("customer.mobile must be 10 digits");

  // ─── 3. Supabase service-role client (bypasses RLS for trusted server) ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return bad(
      "Server misconfigured — Supabase service-role key not set",
      500
    );
  }
  const db = createServiceClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ─── 4. Resolve the plan ───────────────────────────────────────────
  let resolvedPlan: Plan | null = null;
  if (plan?.plan_id) {
    const { data } = await db.from("plans").select("*").eq("id", plan.plan_id).single();
    resolvedPlan = data as Plan | null;
  } else if (plan?.name || plan?.type) {
    const q = db.from("plans").select("*").eq("status", "enabled").limit(1);
    if (plan.name) q.eq("name", plan.name);
    else if (plan.type) q.eq("type", plan.type);
    const { data } = await q.single();
    resolvedPlan = data as Plan | null;
  }
  if (!resolvedPlan) {
    return bad(
      "Plan not found — pass plan.plan_id, plan.name, or plan.type matching an enabled plan",
      422
    );
  }

  // ─── 5. Resolve the retailer (optional but recommended) ───────────
  let resolvedRetailer: Retailer | null = null;
  if (retailer?.retailer_code) {
    const { data } = await db
      .from("retailers")
      .select("*")
      .eq("retailer_code", retailer.retailer_code)
      .single();
    resolvedRetailer = data as Retailer | null;
  } else if (retailer?.shop_name) {
    const { data } = await db
      .from("retailers")
      .select("*")
      .ilike("shop_name", retailer.shop_name)
      .limit(1)
      .single();
    resolvedRetailer = data as Retailer | null;
  }
  // Retailer not found is non-fatal — log + continue with retailer_id=null
  if (retailer && !resolvedRetailer) {
    console.warn(
      "[oroboro-webhook] retailer not found:",
      retailer.retailer_code || retailer.shop_name
    );
  }

  // ─── 6. Idempotency — has this loan already been processed? ───────
  const { data: existing } = await db
    .from("customers")
    .select("*, plan:plans(*), retailer:retailers(*)")
    .eq("external_loan_id", external_loan_id)
    .single();

  if (existing) {
    // Already processed — return the same PDF + customer
    const customerRow = existing as unknown as CustomerWithRelations;
    const doc = buildWarrantyDoc(customerRow);
    return NextResponse.json({
      ok: true,
      idempotent: true,
      message: "Already processed — returning cached customer + freshly-built PDF",
      customer_code: customerRow.customer_code,
      pdf_filename: warrantyPdfFilename(customerRow),
      pdf_base64: doc.output("datauristring"),
    });
  }

  // ─── 7. Compute amounts using plan rates ──────────────────────────
  const planAmount = product.value * (Number(resolvedPlan.plan_amount) / 100);
  const gstAmount = planAmount * (Number(resolvedPlan.gst_percentage) / 100);
  const totalAmount = planAmount + gstAmount;

  const warrantyStart = payload.warranty_start ?? new Date().toISOString().slice(0, 10);
  const start = new Date(warrantyStart);
  const end = new Date(start);
  end.setMonth(end.getMonth() + resolvedPlan.duration_months);
  const warrantyEnd = end.toISOString().slice(0, 10);

  // ─── 8. Auto-generate customer_code via RPC + insert ──────────────
  const { data: nextCode, error: codeErr } = await db.rpc("next_customer_code");
  if (codeErr || !nextCode) {
    return bad(`Failed to generate customer_code: ${codeErr?.message}`, 500);
  }

  const { data: inserted, error: insertErr } = await db
    .from("customers")
    .insert({
      customer_code: nextCode,
      external_loan_id,
      name: customer.name.toUpperCase(),
      mobile: customer.mobile,
      email: customer.email ?? null,
      city: customer.city ?? null,
      state: customer.state ?? null,
      pin_code: customer.pin_code ?? null,
      address: customer.address ?? null,
      brand: product.brand,
      model: product.model,
      imei_serial: product.imei_serial,
      imei2_serial: product.imei2_serial ?? null,
      product_value: product.value,
      plan_id: resolvedPlan.id,
      retailer_id: resolvedRetailer?.id ?? null,
      gst_amount: Number(gstAmount.toFixed(2)),
      plan_amount: Number(planAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
      warranty_start: warrantyStart,
      warranty_end: warrantyEnd,
      status: "enabled",
    })
    .select("*, plan:plans(*), retailer:retailers(*)")
    .single();

  if (insertErr || !inserted) {
    return bad(`Failed to insert customer: ${insertErr?.message}`, 500);
  }

  // ─── 9. Build the warranty PDF ────────────────────────────────────
  const customerRow = inserted as unknown as CustomerWithRelations;
  const doc = buildWarrantyDoc(customerRow);

  // ─── 10. Tomorrow: email/WhatsApp the PDF here ────────────────────
  // Stub for now — once Resend is wired we'll do:
  //   await sendWarrantyEmail({ to: ORO_OPS_INBOX, customer: customerRow, pdf: doc.output("arraybuffer") });
  //   await sendWarrantyEmail({ to: customer.email, ... });

  return NextResponse.json({
    ok: true,
    idempotent: false,
    customer_code: nextCode,
    customer_id: customerRow.id,
    pdf_filename: warrantyPdfFilename(customerRow),
    pdf_base64: doc.output("datauristring"),
    warranty: {
      start_date: warrantyStart,
      end_date: warrantyEnd,
      plan_name: resolvedPlan.name,
      plan_amount: Number(planAmount.toFixed(2)),
      gst_amount: Number(gstAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
    },
  });
}
