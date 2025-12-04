-- Core schema for Roaster application

CREATE TABLE IF NOT EXISTS shoots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inv_date TEXT NOT NULL,
  coordinator TEXT,
  invoice_no TEXT UNIQUE NOT NULL,
  location TEXT,
  work_type TEXT,
  description TEXT,
  shoot_dates TEXT,
  shoot_start_date TEXT,
  shoot_end_date TEXT,
  artist_provided TEXT,
  total_artists INTEGER,
  per_day_rate NUMERIC,
  work_days INTEGER,
  amount NUMERIC,
  received NUMERIC,
  balance NUMERIC,
  status TEXT,
  total_expense NUMERIC,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shoots_invoice_no ON shoots(invoice_no);
CREATE INDEX IF NOT EXISTS idx_shoots_inv_date ON shoots(inv_date);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sr_no INTEGER,
  date TEXT,
  description TEXT,
  paid_for_artist TEXT,
  category TEXT,
  mode TEXT,
  invoice_no TEXT,
  amount_out NUMERIC,
  amount_in NUMERIC,
  total_expense NUMERIC,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments_received (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sr_no INTEGER,
  date TEXT,
  received_from TEXT,
  invoice_no TEXT,
  location TEXT,
  work_type TEXT,
  description TEXT,
  payment_mode TEXT,
  amount_received NUMERIC,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vacations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sr_no INTEGER,
  artist TEXT,
  vacation_range TEXT,
  reason TEXT,
  vacation_start TEXT,
  vacation_end TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vacations_artist ON vacations(artist);

CREATE TABLE IF NOT EXISTS master_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_mode TEXT,
  coordinator TEXT,
  artist TEXT,
  work_type TEXT,
  month TEXT,
  year INTEGER,
  expense_category TEXT
);

CREATE TABLE IF NOT EXISTS roaster_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  artist TEXT,
  source_invoice TEXT,
  coordinator TEXT,
  location TEXT,
  work_type TEXT,
  description TEXT,
  role TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roaster_date_artist
  ON roaster_entries(date, artist);

CREATE TABLE IF NOT EXISTS summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month INTEGER,
  year INTEGER,
  total_shoots INTEGER,
  total_payments NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);


