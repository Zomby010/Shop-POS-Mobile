/** Shapes returned by the Shop POS website's API (apps/api in Shop-POS). Money and quantities are decimal strings. */

export type Dec = string;
export type Level = 'no' | 'yes' | 'pin' | 'own';

export interface User {
  id: number;
  username: string;
  name: string;
  is_owner: boolean;
  roles: string[];
  privileges: Record<string, Level>;
}

export interface ShopSettings {
  business_name: string;
  address: string;
  phone: string;
  kra_pin: string;
  receipt_footer: string;
  paper_width_mm: number;
  receipt_chars: number;
  low_stock_default: Dec;
  allow_credit: boolean;
  logo_url: string | null;
}

export interface Preset {
  id: number;
  kind: 'qty' | 'amount';
  value: Dec;
  price: Dec | null;
  label: string;
  quantity_label: string;
  has_fixed_price: boolean;
  order: number;
}

export interface Product {
  id: number;
  name: string;
  barcode: string | null;
  category_id: number | null;
  category: string | null;
  sold_by: 'piece' | 'weight' | 'volume';
  unit: 'pcs' | 'kg' | 'L';
  selling_price: Dec;
  cost_price?: Dec;
  stock_qty: Dec;
  stock_status: 'out' | 'low' | 'ok';
  low_stock_threshold: Dec | null;
  reorder_qty: Dec | null;
  active: boolean;
  quick_category_id: number | null;
  quick_order: number;
  added_at_till: boolean;
  sell_mode: 'both' | 'qty' | 'amount';
  tiers: { min_qty: Dec; unit_price: Dec }[];
  presets: Preset[];
  alert_at?: Dec;
  last_supplier?: string | null;
}

export interface Catalog {
  products: Product[];
  categories: { id: number; name: string }[];
  quick_categories: { id: number; name: string; order: number }[];
  settings: ShopSettings;
  server_time: string;
}

export interface Payment {
  method: 'cash' | 'mpesa' | 'credit';
  amount: Dec;
  reference: string;
}

export interface SaleSummary {
  id: number;
  receipt_no: string;
  status: 'completed' | 'voided';
  status_label: string;
  completed_at: string;
  total: Dec;
  items: number;
  cashier: string;
  customer: string | null;
  payments: Payment[];
  refunded: Dec;
  credit_due: Dec;
}

export interface SaleLine {
  id: number;
  product_id: number;
  description: string;
  unit: string;
  quantity: Dec;
  unit_price: Dec;
  line_total: Dec;
  tier_applied: boolean;
  entered_as: 'qty' | 'amount' | 'fixed';
  refunded_qty: Dec;
  refundable_qty: Dec;
}

export interface SaleDetail extends SaleSummary {
  subtotal: Dec;
  amount_tendered: Dec;
  change_given: Dec;
  customer_id: number | null;
  lines: SaleLine[];
  refunds: { id: number; created_at: string; total: Dec; method: string; reason: string; is_void: boolean; user: string; authorised_by: string }[];
  receipt_lines?: string[];
  cost_total?: Dec;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  kra_pin: string;
  credit_limit: Dec | null;
  balance: Dec;
  available_credit: Dec | null;
  notes: string;
  active: boolean;
}

export interface CustomerDetail extends Customer {
  statement: { id: number; created_at: string; kind: 'charge' | 'repayment'; amount: Dec; signed_amount: Dec; method: string; note: string; receipt_no: string | null }[];
  unpaid_sales: { id: number; receipt_no: string; completed_at: string; total: Dec; credit_due: Dec }[];
  recent_sales: SaleSummary[];
}

export interface ExpectedTakings {
  start: string;
  end: string;
  sales_count: number;
  opening_float: Dec;
  cash_sales: Dec;
  mpesa_sales: Dec;
  credit_sales: Dec;
  credit_repaid: Dec;
  cash_refunds: Dec;
  mpesa_refunds: Dec;
  cash_repayments: Dec;
  mpesa_repayments: Dec;
  cash_expenses: Dec;
  expected_cash: Dec;
  expected_mpesa: Dec;
}

export interface CashUp {
  id: number;
  cashier: string;
  period_start: string;
  period_end: string;
  opening_float: Dec;
  expected_cash: Dec;
  counted_cash: Dec;
  cash_difference: Dec;
  expected_mpesa: Dec;
  counted_mpesa: Dec;
  mpesa_difference: Dec;
  note: string;
}

export interface Summary {
  start: string;
  end: string;
  sales_count: number;
  voided_count: number;
  gross_sales: Dec;
  refunds: Dec;
  net_sales: Dec;
  average_sale: Dec;
  paid_by: { cash: Dec; mpesa: Dec; credit: Dec };
  collected: { cash: Dec; mpesa: Dec; total: Dec };
  deni: { given: Dec; repaid: Dec; owed_now: Dec };
  profit: { cost_of_sales: Dec; gross_profit: Dec; margin_pct: Dec; expenses: Dec; stock_loss: Dec; net_profit: Dec };
  suppliers: { bought: Dec; paid: Dec; owed: Dec };
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  kra_pin: string;
  active: boolean;
  owed: Dec;
}
