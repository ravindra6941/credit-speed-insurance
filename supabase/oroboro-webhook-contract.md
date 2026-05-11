# Oroboro → Credit Speed Webhook Contract

*Shared with: Transwarranty / Oroboro tech team*
*Owner: Credit Speed (Ravindra Singh, CTO)*

When Oroboro approves a loan on its side, please POST the loan details to
Credit Speed's webhook. We'll:

1. Auto-generate the customer's warranty / extended-protection PDF
2. Store the customer record in our Supabase
3. Return the PDF (base64) + warranty dates + amounts in the response

You can either attach the returned PDF to your loan agreement, OR rely on
Credit Speed to email/WhatsApp it directly to the customer (we'll do
both starting next week).

---

## Endpoint

```
POST https://admin.creditspeed.in/api/webhooks/oroboro
```

## Auth

Bearer token in the `Authorization` header — value will be shared
out-of-band by Ravindra. Treat as a secret.

```
Authorization: Bearer <token>
Content-Type: application/json
```

## Request body (JSON)

```jsonc
{
  // Your internal loan/file id. We use this as the idempotency key —
  // retrying the same external_loan_id returns the same customer + same
  // PDF instead of creating a duplicate. **Required.**
  "external_loan_id": "ORO-2026-000123",

  "customer": {
    "name":     "RAJESH KUMAR",      // required
    "mobile":   "9876543210",        // required — 10 digits, India
    "email":    "rajesh@example.com",// optional
    "city":     "Kanpur",            // optional
    "state":    "Uttar Pradesh",     // optional
    "pin_code": "208001",            // optional
    "address":  "12, Civil Lines, Kanpur" // optional
  },

  "product": {
    "brand":         "Vivo",         // required
    "model":         "T5X 5G 8/256GB", // required
    "imei_serial":   "861234567890123", // required — exactly 15 digits
    "imei2_serial":  "861234567890456", // optional — 15 digits if provided
    "value":         15000           // required — phone price in ₹ (number, > 0)
  },

  // Plan — provide ONE of: plan_id, name, or type
  "plan": {
    "plan_id": 1,                              // OR
    "name":    "EXTENDED WARRANTY",            // OR
    "type":    "extended_warranty"             // one of: extended_warranty, screen_damage,
                                               //          standard_protection, iphone_protection, custom
  },

  // Retailer — by retailer_code preferably (we generate these on our side
  // as "CSINS-Rxxxx"). Falls back to fuzzy shop_name match. Optional but
  // recommended — without it, the merchant column on the warranty PDF
  // shows "—".
  "retailer": {
    "retailer_code": "CSINS-R0042",   // OR
    "shop_name":     "Jagdamba Mobile"
  },

  // Optional. Defaults to today (YYYY-MM-DD) if omitted.
  "warranty_start": "2026-05-12"
}
```

## Successful response (200)

```jsonc
{
  "ok": true,
  "idempotent": false,                 // true if external_loan_id was already processed
  "customer_code": "CSINS-C0042",      // our internal customer ID
  "customer_id": 42,                   // numeric DB id
  "pdf_filename": "Warranty_CSINS-C0042_RAJESH_KUMAR.pdf",
  "pdf_base64": "data:application/pdf;base64,JVBERi0xLjMK...",
  "warranty": {
    "start_date":   "2026-05-12",
    "end_date":     "2027-05-12",
    "plan_name":    "EXTENDED WARRANTY",
    "plan_amount":  900.00,            // 6% of product.value
    "gst_amount":   162.00,            // 18% GST on plan_amount
    "total_amount": 1062.00            // plan + GST
  }
}
```

## Error responses

| Status | Body                                                  | Meaning |
|--------|-------------------------------------------------------|---------|
| 400    | `{ ok: false, error: "..." }`                         | Invalid payload (missing field, bad IMEI, etc.) |
| 401    | `{ ok: false, error: "Unauthorized" }`                | Bearer token missing / wrong |
| 422    | `{ ok: false, error: "Plan not found ..." }`          | Plan reference doesn't match any enabled plan on our side |
| 500    | `{ ok: false, error: "..." }`                         | Server error |

## Idempotency

Send the same `external_loan_id` as many times as you want — we'll always
return the original `customer_code` + a freshly-rebuilt PDF, never create
a duplicate. Safe to retry on network failures.

## Notes

- `imei_serial` and `imei2_serial` must be exactly **15 digits** (no spaces / hyphens).
- `customer.mobile` must be **10 digits** (no country code, no spaces).
- All money values are in ₹ as plain numbers (e.g. `15000`, not `"₹15,000"`).
- We compute plan / GST / total ourselves from the plan's configured rates — you
  don't need to send these; we'll return them in the response.

## Testing

Before going live, hit the endpoint with a test payload and verify:
- You get back a valid base64 PDF (decode it, open it — should be the warranty pack).
- Calling the same `external_loan_id` twice returns `idempotent: true` on the 2nd call.
- An invalid IMEI returns `400`.

Credit Speed team will share:
- The bearer token (out-of-band)
- A test `plan.name` value that maps to a real plan in our DB
- A test `retailer.retailer_code` we've pre-created for sandbox testing
