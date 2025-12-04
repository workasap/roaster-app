-- Sample seed data for development and testing

INSERT INTO shoots (
  inv_date,
  coordinator,
  invoice_no,
  location,
  work_type,
  description,
  shoot_dates,
  shoot_start_date,
  shoot_end_date,
  artist_provided,
  total_artists,
  per_day_rate,
  work_days,
  amount,
  received,
  balance,
  status,
  total_expense
)
VALUES
  (
    "2025-11-01",
    "RAHUL",
    "INV-001",
    "MUMBAI",
    "AD SHOOT",
    "Main brand film",
    "01-11-2025 TO 02-11-2025",
    "2025-11-01",
    "2025-11-02",
    "ANYA, AIMEE",
    2,
    10000,
    2,
    40000,
    20000,
    20000,
    "PARTIAL",
    5000
  );

INSERT INTO expenses (
  sr_no,
  date,
  description,
  paid_for_artist,
  category,
  mode,
  invoice_no,
  amount_out,
  amount_in,
  total_expense
)
VALUES
  (
    1,
    "2025-11-01",
    "Travel to location",
    "ANYA",
    "TRAVEL",
    "CASH",
    "INV-001",
    5000,
    0,
    5000
  );

INSERT INTO payments_received (
  sr_no,
  date,
  received_from,
  invoice_no,
  location,
  work_type,
  description,
  payment_mode,
  amount_received
)
VALUES
  (
    1,
    "2025-11-05",
    "CLIENT A",
    "INV-001",
    "MUMBAI",
    "AD SHOOT",
    "Advance payment",
    "NEFT",
    20000
  );

INSERT INTO vacations (
  sr_no,
  artist,
  vacation_range,
  reason,
  vacation_start,
  vacation_end
)
VALUES
  (
    1,
    "ANYA",
    "03-11-2025 TO 05-11-2025",
    "Personal",
    "2025-11-03",
    "2025-11-05"
  );


