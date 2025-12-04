-- Initial schema for Roaster D1 database

CREATE TABLE IF NOT EXISTS shoots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shoot_date TEXT,
  project_name TEXT,
  location TEXT,
  director TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS payments_received (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_date TEXT,
  client_name TEXT,
  amount NUMERIC,
  currency TEXT,
  method TEXT,
  reference TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS vacation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_name TEXT,
  start_date TEXT,
  end_date TEXT,
  days INTEGER,
  type TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS master_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT,
  key TEXT,
  value TEXT,
  description TEXT
);

CREATE TABLE IF NOT EXISTS roaster (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  employee_name TEXT,
  role TEXT,
  shift TEXT,
  location TEXT,
  notes TEXT
);


