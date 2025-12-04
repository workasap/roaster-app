-- Add helpful indices for faster month/year filters

CREATE INDEX IF NOT EXISTS idx_payments_date ON payments_received(date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

