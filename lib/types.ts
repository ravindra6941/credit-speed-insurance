/**
 * Database row types — match the schema in supabase/schema.sql exactly.
 * Manual definitions (small schema, no codegen yet).
 */

export type StatusEnum = "enabled" | "disabled";

export type Plan = {
  id: number;
  name: string;
  type:
    | "extended_warranty"
    | "screen_damage"
    | "standard_protection"
    | "iphone_protection"
    | "custom";
  gst_percentage: number;
  plan_amount: number;
  duration_months: number;
  coverage_notes: string | null;
  status: StatusEnum;
  created_at: string;
  created_by: string | null;
};

export type Retailer = {
  id: number;
  retailer_code: string;
  shop_name: string;
  owner_name: string | null;
  gst_number: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  address: string | null;
  status: StatusEnum;
  created_at: string;
  created_by: string | null;
};

export type Customer = {
  id: number;
  customer_code: string;
  external_loan_id: string | null;
  name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  address: string | null;

  brand: string | null;
  model: string | null;
  imei_serial: string | null;
  imei2_serial: string | null;
  product_value: number;

  plan_id: number | null;
  retailer_id: number | null;

  gst_amount: number;
  plan_amount: number;
  total_amount: number;

  warranty_start: string;
  warranty_end: string | null;

  status: StatusEnum;
  created_at: string;
  created_by: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "admin" | "team_member";
  created_at: string;
};

/** Customer joined with plan + retailer (for table display + PDF). */
export type CustomerWithRelations = Customer & {
  plan: Plan | null;
  retailer: Retailer | null;
};
