-- Indexes to optimize shoot queries
CREATE INDEX IF NOT EXISTS idx_shoots_inv_date ON shoots(inv_date);
CREATE INDEX IF NOT EXISTS idx_shoots_start ON shoots(shoot_start_date);
CREATE INDEX IF NOT EXISTS idx_shoots_end ON shoots(shoot_end_date);
