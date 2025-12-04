export interface Shoot {
  id?: number;
  inv_date: string;
  coordinator?: string | null;
  invoice_no: string;
  location?: string | null;
  work_type?: string | null;
  description?: string | null;
  shoot_dates?: string | null;
  shoot_start_date?: string | null;
  shoot_end_date?: string | null;
  artist_provided?: string | null;
  total_artists?: number | null;
  per_day_rate?: number | null;
  work_days?: number | null;
  amount?: number | null;
  received?: number | null;
  balance?: number | null;
  status?: string | null;
  total_expense?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id?: number;
  sr_no?: number | null;
  date?: string | null;
  description?: string | null;
  remark?: string | null;
  paid_for_artist?: string | null;
  category?: string | null;
  mode?: string | null;
  invoice_no?: string | null;
  amount_out?: number | null;
  amount_in?: number | null;
  total_expense?: number | null;
  created_at?: string;
}

export interface Payment {
  id?: number;
  sr_no?: number | null;
  date?: string | null;
  received_from?: string | null;
  invoice_no?: string | null;
  location?: string | null;
  work_type?: string | null;
  description?: string | null;
  payment_mode?: string | null;
  amount_received?: number | null;
  created_at?: string;
}

export interface Vacation {
  id?: number;
  sr_no?: number | null;
  artist?: string | null;
  vacation_range?: string | null;
  reason?: string | null;
  vacation_start?: string | null;
  vacation_end?: string | null;
  created_at?: string;
}

export interface MasterData {
  id?: number;
  payment_mode?: string | null;
  coordinator?: string | null;
  artist?: string | null;
  work_type?: string | null;
  month?: string | null;
  year?: number | null;
  expense_category?: string | null;
}

export interface RoasterEntry {
  id?: number;
  date: string;
  artist: string;
  source_invoice: string;
  coordinator?: string | null;
  location?: string | null;
  work_type?: string | null;
  description?: string | null;
  role?: string | null;
  created_at?: string;
}

export interface Summary {
  id?: number;
  month: number;
  year: number;
  total_shoots: number;
  total_payments: number;
  total_expenses: number;
  net_balance: number;
  generated_at?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface YearlySummary {
  year: number;
  totals: { revenue: number; expenses: number; profit: number; shoots: number };
  monthly: {
    revenue: { m: string; total: number }[];
    expenses: { m: string; total: number }[];
    shoots: { m: string; total: number }[];
  };
  top_clients: { name: string | null; total: number }[];
  top_expenses: { name: string | null; total: number }[];
  compare_prev_year: {
    revenue: { current: number; previous: number; growth_pct: number };
    expenses: { current: number; previous: number; growth_pct: number };
    profit: { current: number; previous: number; growth_pct: number };
  };
}


