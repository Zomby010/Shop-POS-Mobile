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
  deni: { given: Dec; repaid: Dec; owed_now: Dec; repaid_cash: Dec; repaid_mpesa: Dec };
  profit: { cost_of_sales: Dec; gross_profit: Dec; margin_pct: Dec; expenses: Dec; stock_loss: Dec; net_profit: Dec };
  suppliers: { bought: Dec; paid: Dec; owed: Dec };
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  kra_pin: string;
  notes: string;
  active: boolean;
  owed: Dec;
}

export interface DocumentSummary { id: number; code: string; kind: string; date: string; status: string; status_label: string; total: Dec }

export interface SupplierPage {
  supplier: Supplier; total_bought: Dec; total_paid: Dec; purchases: PurchaseSummary[];
  payments: { id: number; date: string; amount: Dec; method: string; method_label: string; note: string;
    purchase_id: number; purchase: string; cancelled: boolean; user: string | null }[];
  documents: DocumentSummary[]; can_receive: boolean; can_pay: boolean; can_edit: boolean;
}

// ---------------------------------------------------------------- products

export interface Choice { value: string; label: string }
export interface Named { id: number; name: string }

export interface ProductChoices {
  sold_by: Choice[];
  sell_mode: Choice[];
  piece_size_unit: Choice[];
  categories: Named[];
  quick_categories: Named[];
}

export interface ProductList extends ProductChoices {
  products: Product[];
  next_offset: number | null;
  till_count: number;
}

export interface Movement {
  id: number;
  created_at: string;
  product_id: number;
  product: string;
  unit: string;
  kind: string;
  kind_label: string;
  quantity: Dec;
  stock_before: Dec | null;
  stock_after: Dec | null;
  unit_cost: Dec;
  user: string | null;
  reason: string;
  reference: string;
}

export interface TierRow { id?: number; min_qty: Dec; unit_price: Dec }
export interface PresetRow { id?: number; text: string; price: Dec | null; label: string; order: number; hidden: boolean }

export interface ProductDetail extends Omit<Product, 'tiers' | 'presets'> {
  piece_size: Dec | null;
  piece_size_unit: 'kg' | 'L';
  sell_mode_setting: 'both' | 'qty' | 'amount';
  tiers: TierRow[];
  presets: PresetRow[];
  recent_movements: Movement[];
}

export interface CategoryRow { id: number; name: string; description?: string; order: number; active?: boolean; item_count: number }

// ---------------------------------------------------------------- stock

export interface PurchaseSummary {
  id: number;
  code: string;
  date: string;
  supplier_id: number | null;
  supplier: string | null;
  supplier_reference: string;
  total: Dec;
  amount_paid: Dec;
  balance: Dec;
  payment_status: string;
  cancelled: boolean;
  user: string | null;
  line_count?: number;
}

export interface PurchaseDetail extends PurchaseSummary {
  note: string;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string;
  lines: { product_id: number; product: string; packs: Dec; pack_size: Dec; pack_cost: Dec; quantity: Dec; unit: string; unit_cost: Dec; line_total: Dec }[];
  payments: { id: number; date: string; amount: Dec; method: string; method_label: string; note: string; user: string | null }[];
}

export interface StockOverview {
  low_stock_count: number;
  open_stocktake: { id: number; code: string; started_at: string } | null;
  purchases: PurchaseSummary[];
  movements: Movement[];
}

export interface ConversionRow {
  id: number;
  code: string;
  created_at: string;
  from_product: string;
  from_qty: Dec;
  from_unit: string;
  note: string;
  user: string | null;
  lines: { product: string; quantity: Dec; unit: string }[];
}

export interface StockTake {
  id: number;
  code: string;
  status: 'open' | 'approved' | 'cancelled';
  status_label: string;
  note: string;
  started_at: string;
  started_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  line_count?: number;
}

export interface StockTakeLine {
  id: number;
  product_id: number;
  product: string;
  unit: string;
  loose: boolean;
  category_id: number | null;
  category: string | null;
  barcode: string | null;
  expected_qty: Dec;
  counted_qty: Dec | null;
  variance: Dec | null;
  variance_value?: Dec;
}

export interface StockTakeSheet {
  stocktake: StockTake;
  errors: string[];
  counted_count: number;
  total_count: number;
  variance_value: Dec | null;
  lines: StockTakeLine[];
}

export interface LossRow {
  product_id: number;
  product: string;
  unit: string;
  stocktakes: number;
  expected: Dec;
  counted: Dec;
  variance: Dec;
  variance_pct: Dec;
  recorded_losses: Dec;
  total_loss: Dec;
  sold: Dec;
  loss_pct_of_sales: Dec;
  variance_value?: Dec;
  recorded_loss_value?: Dec;
}

export interface SalesTotals {
  cash: Dec; mpesa: Dec; credit: Dec; total: Dec; refunded: Dec; net: Dec; credit_due: Dec; count: number;
  deni_given: Dec; deni_repaid: { cash: Dec; mpesa: Dec; total: Dec };
}

export interface DeniEntry {
  id: number; created_at: string; kind: 'charge' | 'repayment'; amount: Dec; method: 'cash' | 'mpesa' | null;
  label: string; customer_id: number; customer: string; sale_id: number | null; receipt_no: string | null;
  note: string; user: string | null;
}

export interface DeniActivity {
  start: string; end: string; owed_now: Dec; entries: DeniEntry[];
  totals: { given: Dec; repaid: Dec; repaid_cash: Dec; repaid_mpesa: Dec; cleared: Dec };
}

/** A loss, recount or stock-take change. `value` is quantity × cost at the time, for those who see cost. */
export interface StockChange extends Omit<Movement, 'unit_cost'> { value?: Dec }

export interface StockLossRow {
  product_id: number; product: string; unit: string; lost_qty: Dec; found_qty: Dec; net_qty: Dec;
  lost_value?: Dec; found_value?: Dec; stock_loss?: Dec; movements: StockChange[];
}

export interface StockLoss {
  start: string; end: string; lost_value?: Dec; found_value?: Dec; stock_loss?: Dec; rows: StockLossRow[];
}

export interface RecountRecord {
  id: number; code: string; created_at: string; kind: string; kind_label: string; note: string; user: string | null;
  movements: (Omit<Movement, 'unit_cost'> & { unit_cost?: Dec })[];
}
