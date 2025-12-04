import { Router } from "itty-router";
import type { Env } from "./db";
import { queryAll, queryOne, execute, transaction } from "./db";
import {
  buildRoasterMatrix,
  computeShootDerivedFields,
  expandDateRange,
  normalizeArtistName,
  parseArtistList,
  parseIsoDate,
  parseNumber,
  parseRangeToIso,
  calculateCoordinatorAmount
} from "./logic";
import type {
  ApiResponse,
  Paginated,
  Shoot,
  Expense,
  Payment,
  Vacation,
  MasterData,
  RoasterEntry,
  Summary
} from "./types";
  
const router = Router();

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

function json<T>(body: ApiResponse<T> | T, status = 200): Response {
  const payload =
    body && typeof body === "object" && "success" in (body as ApiResponse<T>)
      ? (body as ApiResponse<T>)
      : ({ success: true, data: body as T } satisfies ApiResponse<T>);
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function readJson<T = unknown>(request: Request): Promise<T> {
  const text = await request.text();
  if (!text) throw new Error("Empty JSON body");
  return JSON.parse(text) as T;
}

function withCors(request: Request, env: Env, response: Response): Response {
  const origin = request.headers.get("Origin");
  const allowed =
    env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? ["*"];

  const headers = new Headers(response.headers);
  if (!origin || allowed.includes("*")) {
    headers.set("Access-Control-Allow-Origin", "*");
  } else if (allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Origin,Accept"
  );

  return new Response(response.body, { status: response.status, headers });
}

function getPagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const rawPageSize = parseInt(
    url.searchParams.get("pageSize") || `${DEFAULT_PAGE_SIZE}`,
    10
  );
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function normalizeExpense(input: Partial<Expense>): Partial<Expense> {
  const result: Partial<Expense> = { ...input };
  const iso = parseIsoDate(input.date);
  if (iso) result.date = iso;
  const out = parseNumber(input.amount_out);
  const inc = parseNumber(input.amount_in);
  if (out !== undefined) result.amount_out = out;
  if (inc !== undefined) result.amount_in = inc;
  if (out !== undefined || inc !== undefined) {
    result.total_expense =
      result.total_expense ?? (out ?? 0) - (inc ?? 0);
  }
  if (input.paid_for_artist) {
    const tokens = String(input.paid_for_artist)
      .split(/[;,]/)
      .map((t) => normalizeArtistName(t))
      .filter((t) => t.length > 0);
    result.paid_for_artist = tokens.join(", ");
  }
  if (result.description) {
    result.description = result.description.trim().toUpperCase();
  }
  if (result.remark) {
    result.remark = result.remark.trim().toUpperCase();
  }
  if (result.category) {
    result.category = result.category.trim().toUpperCase();
  }
  if (result.mode) {
    result.mode = result.mode.trim().toUpperCase();
  }
  if (result.invoice_no) {
    result.invoice_no = result.invoice_no.trim().toUpperCase();
  }
  if (input.sr_no !== undefined) {
    const serial = parseNumber(input.sr_no);
    if (serial !== undefined) result.sr_no = serial;
  }
  return result;
}

function normalizePayment(input: Partial<Payment>): Partial<Payment> {
  const result: Partial<Payment> = { ...input };
  const iso = parseIsoDate(input.date);
  if (iso) result.date = iso;
  const serial = parseNumber(input.sr_no);
  if (serial !== undefined) result.sr_no = serial;
  const amount = parseNumber(input.amount_received);
  if (amount !== undefined) result.amount_received = amount;
  if (result.payment_mode) {
    result.payment_mode = result.payment_mode.trim().toUpperCase();
  }
  if (result.received_from) {
    result.received_from = result.received_from.trim().toUpperCase();
  }
  if (result.invoice_no) {
    result.invoice_no = result.invoice_no.trim().toUpperCase();
  }
  if (result.location) {
    result.location = result.location.trim().toUpperCase();
  }
  if (result.work_type) {
    result.work_type = result.work_type.trim().toUpperCase();
  }
  if (result.description) {
    result.description = result.description.trim().toUpperCase();
  }
  return result;
}

function normalizeVacation(input: Partial<Vacation>): Partial<Vacation> {
  const result: Partial<Vacation> = { ...input };
  if (input.artist) {
    result.artist = normalizeArtistName(input.artist);
  }
  if (result.reason) {
    result.reason = result.reason.trim().toUpperCase();
  }
  if (input.vacation_range && (!input.vacation_start || !input.vacation_end)) {
    const range = parseRangeToIso(input.vacation_range);
    if (range) {
      result.vacation_start = range.start;
      result.vacation_end = range.end;
    }
  }
  const startIso = parseIsoDate(result.vacation_start);
  if (startIso) result.vacation_start = startIso;
  const endIso = parseIsoDate(result.vacation_end);
  if (endIso) result.vacation_end = endIso;
  const serial = parseNumber(result.sr_no);
  if (serial !== undefined) result.sr_no = serial;
  return result;
}

function normalizeMasterData(input: Partial<MasterData>): Partial<MasterData> {
  const result: Partial<MasterData> = { ...input };
  if (result.artist) {
    result.artist = normalizeArtistName(result.artist);
  }
  if (result.coordinator) {
    result.coordinator = result.coordinator.trim().toUpperCase();
  }
  if (result.payment_mode) {
    result.payment_mode = result.payment_mode.trim().toUpperCase();
  }
  if (result.work_type) {
    result.work_type = result.work_type.trim().toUpperCase();
  }
  if (result.month) {
    result.month = result.month.trim().toUpperCase();
  }
  if (result.expense_category) {
    result.expense_category = result.expense_category.trim().toUpperCase();
  }
  const year = parseNumber(result.year);
  if (year !== undefined) result.year = year;
  return result;
}

router.options("*", () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,Origin,Accept"
    }
  })
);

router.get("/", () => {
  return json({
    message: "Roaster API is running",
    endpoints: [
      "/api/shoots",
      "/api/payments",
      "/api/expenses",
      "/api/vacations",
      "/api/master-data",
      "/api/artists",
      "/api/availability",
      "/api/yearly-summary",
      "/api/roaster-entries",
      "/api/summary"
    ]
  });
});

router.get("/api/health", async (_request, env: Env) => {
  const ok = await queryOne<{ ok: number }>(env, "SELECT 1 as ok", []);
  return json({ ok: ok?.ok === 1 });
});

router.get("/api/shoots", async (request, env: Env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);

  const where: string[] = [];
  const params: unknown[] = [];

  const invoiceNo = url.searchParams.get("invoice_no");
  const coordinator = url.searchParams.get("coordinator");
  const location = url.searchParams.get("location");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (invoiceNo) {
    where.push("invoice_no LIKE ?");
    params.push(`%${invoiceNo}%`);
  }
  if (coordinator) {
    where.push("coordinator LIKE ?");
    params.push(`%${coordinator}%`);
  }
  if (location) {
    where.push("location LIKE ?");
    params.push(`%${location}%`);
  }
  if (from) {
    where.push("inv_date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("inv_date <= ?");
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: number }>(
    env,
    `SELECT COUNT(*) as count FROM shoots ${whereSql}`,
    params
  );
  const total = totalRow?.count ?? 0;

  const items = await queryAll<Shoot>(
    env,
    `SELECT * FROM shoots ${whereSql} ORDER BY inv_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const payload: Paginated<Shoot> = {
    items,
    page,
    pageSize,
    total
  };

  return json(payload);
});

router.get("/api/shoots/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  const shoot = await queryOne<Shoot>(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );

  if (!shoot) {
    return json({ success: false, error: "Not found" }, 404);
  }

  return json<Shoot>({ success: true, data: shoot });
});

router.post("/api/shoots", async (request, env: Env) => {
  let body: Shoot;
  try {
    body = await readJson<Shoot>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  if (!body.invoice_no) {
    return json({ success: false, error: "invoice_no is required" }, 400);
  }

  const existing = await queryOne<Shoot>(
    env,
    "SELECT id FROM shoots WHERE invoice_no = ?",
    [body.invoice_no]
  );
  if (existing) {
    return json(
      { success: false, error: "invoice_no already exists" },
      409
    );
  }

  const shoot = computeShootDerivedFields(body);

  if (!shoot.inv_date) {
    return json(
      { success: false, error: "inv_date or valid shoot_dates is required" },
      400
    );
  }

  const sql = `
    INSERT INTO shoots (
      inv_date, coordinator, invoice_no, location, work_type, description,
      shoot_dates, shoot_start_date, shoot_end_date, artist_provided,
      total_artists, per_day_rate, work_days, amount, received, balance,
      status, total_expense
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params: unknown[] = [
    shoot.inv_date,
    shoot.coordinator ?? null,
    shoot.invoice_no,
    shoot.location ?? null,
    shoot.work_type ?? null,
    shoot.description ?? null,
    shoot.shoot_dates ?? null,
    shoot.shoot_start_date ?? null,
    shoot.shoot_end_date ?? null,
    shoot.artist_provided ?? null,
    shoot.total_artists ?? null,
    shoot.per_day_rate ?? null,
    shoot.work_days ?? null,
    shoot.amount ?? null,
    shoot.received ?? null,
    shoot.balance ?? null,
    shoot.status ?? null,
    shoot.total_expense ?? null
  ];

  let meta;
  try {
    meta = await execute(env, sql, params);
  } catch (error) {
    const msg = String((error as Error).message || "");
    if (/unique/i.test(msg) && /invoice_no/i.test(msg)) {
      return json(
        { success: false, error: "invoice_no already exists" },
        409
      );
    }
    throw error;
  }
  const created = await queryOne<Shoot>(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [meta.last_row_id]
  );

  return json<Shoot>({ success: true, data: created! }, 201);
});

router.put("/api/shoots/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Shoot;
  try {
    body = await readJson<Shoot>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  body.id = id;

  const shoot = computeShootDerivedFields(body);

  const sql = `
    UPDATE shoots SET
      inv_date = ?,
      coordinator = ?,
      invoice_no = ?,
      location = ?,
      work_type = ?,
      description = ?,
      shoot_dates = ?,
      shoot_start_date = ?,
      shoot_end_date = ?,
      artist_provided = ?,
      total_artists = ?,
      per_day_rate = ?,
      work_days = ?,
      amount = ?,
      received = ?,
      balance = ?,
      status = ?,
      total_expense = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params: unknown[] = [
    shoot.inv_date,
    shoot.coordinator ?? null,
    shoot.invoice_no,
    shoot.location ?? null,
    shoot.work_type ?? null,
    shoot.description ?? null,
    shoot.shoot_dates ?? null,
    shoot.shoot_start_date ?? null,
    shoot.shoot_end_date ?? null,
    shoot.artist_provided ?? null,
    shoot.total_artists ?? null,
    shoot.per_day_rate ?? null,
    shoot.work_days ?? null,
    shoot.amount ?? null,
    shoot.received ?? null,
    shoot.balance ?? null,
    shoot.status ?? null,
    shoot.total_expense ?? null,
    id
  ];

  try {
    await execute(env, sql, params);
  } catch (error) {
    const msg = String((error as Error).message || "");
    if (/unique/i.test(msg) && /invoice_no/i.test(msg)) {
      return json(
        { success: false, error: "invoice_no already exists" },
        409
      );
    }
    throw error;
  }

  const updated = await queryOne<Shoot>(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  return json<Shoot>({ success: true, data: updated! });
});

router.patch("/api/shoots/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Partial<Shoot>;
  try {
    body = await readJson<Partial<Shoot>>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const existing = await queryOne<Shoot>(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  if (!existing) {
    return json({ success: false, error: "Not found" }, 404);
  }

  const merged = computeShootDerivedFields({ ...existing, ...body });

  const sql = `
    UPDATE shoots SET
      inv_date = ?,
      coordinator = ?,
      invoice_no = ?,
      location = ?,
      work_type = ?,
      description = ?,
      shoot_dates = ?,
      shoot_start_date = ?,
      shoot_end_date = ?,
      artist_provided = ?,
      total_artists = ?,
      per_day_rate = ?,
      work_days = ?,
      amount = ?,
      received = ?,
      balance = ?,
      status = ?,
      total_expense = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const params: unknown[] = [
    merged.inv_date,
    merged.coordinator ?? null,
    merged.invoice_no,
    merged.location ?? null,
    merged.work_type ?? null,
    merged.description ?? null,
    merged.shoot_dates ?? null,
    merged.shoot_start_date ?? null,
    merged.shoot_end_date ?? null,
    merged.artist_provided ?? null,
    merged.total_artists ?? null,
    merged.per_day_rate ?? null,
    merged.work_days ?? null,
    merged.amount ?? null,
    merged.received ?? null,
    merged.balance ?? null,
    merged.status ?? null,
    merged.total_expense ?? null,
    id
  ];

  await execute(env, sql, params);

  const updated = await queryOne<Shoot>(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  return json<Shoot>({ success: true, data: updated! });
});

router.get("/api/expenses", async (request, env: Env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);

  const where: string[] = [];
  const params: unknown[] = [];

  const invoice = url.searchParams.get("invoice_no");
  const category = url.searchParams.get("category");
  const mode = url.searchParams.get("mode");
  const vendor = url.searchParams.get("vendor");
  const description = url.searchParams.get("description");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (invoice) {
    where.push("invoice_no LIKE ?");
    params.push(`%${invoice}%`);
  }
  if (category) {
    where.push("category LIKE ?");
    params.push(`%${category}%`);
  }
  if (mode) {
    where.push("mode LIKE ?");
    params.push(`%${mode}%`);
  }
  if (vendor) {
    where.push("paid_for_artist LIKE ?");
    params.push(`%${vendor}%`);
  }
  if (description) {
    where.push("description LIKE ?");
    params.push(`%${description}%`);
  }
  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: number }>(
    env,
    `SELECT COUNT(*) as count FROM expenses ${whereSql}`,
    params
  );

  const items = await queryAll<Expense>(
    env,
    `SELECT * FROM expenses ${whereSql} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return json<Paginated<Expense>>({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});

router.post("/api/expenses", async (request, env: Env) => {
  let body: Expense;
  try {
    body = await readJson<Expense>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const expense = normalizeExpense(body);
  if (!expense.date) {
    return json({ success: false, error: "date is required" }, 400);
  }

  const sql = `
    INSERT INTO expenses (
      sr_no, date, description, remark, paid_for_artist, category, mode,
      invoice_no, amount_out, amount_in, total_expense
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `;

  const params: unknown[] = [
    expense.sr_no ?? null,
    expense.date,
    expense.description ?? null,
    expense.remark ?? null,
    expense.paid_for_artist ?? null,
    expense.category ?? null,
    expense.mode ?? null,
    expense.invoice_no ?? null,
    expense.amount_out ?? null,
    expense.amount_in ?? null,
    expense.total_expense ?? null
  ];

  const meta = await execute(env, sql, params);
  const created = await queryOne<Expense>(
    env,
    "SELECT * FROM expenses WHERE id = ?",
    [meta.last_row_id]
  );

  return json(created!);
});

router.patch("/api/expenses/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Partial<Expense>;
  try {
    body = await readJson<Partial<Expense>>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const existing = await queryOne<Expense>(
    env,
    "SELECT * FROM expenses WHERE id = ?",
    [id]
  );
  if (!existing) {
    return json({ success: false, error: "Not found" }, 404);
  }

  const merged = normalizeExpense({ ...existing, ...body });

  const sql = `
    UPDATE expenses SET
      sr_no = ?,
      date = ?,
      description = ?,
      remark = ?,
      paid_for_artist = ?,
      category = ?,
      mode = ?,
      invoice_no = ?,
      amount_out = ?,
      amount_in = ?,
      total_expense = ?
    WHERE id = ?
  `;

  const params: unknown[] = [
    merged.sr_no ?? null,
    merged.date ?? existing.date,
    merged.description ?? null,
    merged.remark ?? null,
    merged.paid_for_artist ?? null,
    merged.category ?? null,
    merged.mode ?? null,
    merged.invoice_no ?? null,
    merged.amount_out ?? null,
    merged.amount_in ?? null,
    merged.total_expense ?? null,
    id
  ];

  await execute(env, sql, params);

  const updated = await queryOne<Expense>(
    env,
    "SELECT * FROM expenses WHERE id = ?",
    [id]
  );

  return json(updated!);
});

router.delete("/api/expenses/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM expenses WHERE id = ?", [id]);
  return json({ success: true });
});

router.get("/api/payments", async (request, env: Env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);

  const where: string[] = [];
  const params: unknown[] = [];

  const invoice = url.searchParams.get("invoice_no");
  const mode = url.searchParams.get("payment_mode");
  const receivedFrom = url.searchParams.get("received_from");
  const location = url.searchParams.get("location");
  const workType = url.searchParams.get("work_type");
  const description = url.searchParams.get("description");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (invoice) {
    where.push("invoice_no LIKE ?");
    params.push(`%${invoice}%`);
  }
  if (mode) {
    where.push("payment_mode LIKE ?");
    params.push(`%${mode}%`);
  }
  if (receivedFrom) {
    where.push("received_from LIKE ?");
    params.push(`%${receivedFrom}%`);
  }
  if (location) {
    where.push("location LIKE ?");
    params.push(`%${location}%`);
  }
  if (workType) {
    where.push("work_type LIKE ?");
    params.push(`%${workType}%`);
  }
  if (description) {
    where.push("description LIKE ?");
    params.push(`%${description}%`);
  }
  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: number }>(
    env,
    `SELECT COUNT(*) as count FROM payments_received ${whereSql}`,
    params
  );

  const items = await queryAll<Payment>(
    env,
    `SELECT * FROM payments_received ${whereSql} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return json<Paginated<Payment>>({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});

router.post("/api/payments", async (request, env: Env) => {
  let body: Payment;
  try {
    body = await readJson<Payment>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const payment = normalizePayment(body);
  if (!payment.date) {
    return json({ success: false, error: "date is required" }, 400);
  }

  const sql = `
    INSERT INTO payments_received (
      sr_no, date, received_from, invoice_no, location, work_type,
      description, payment_mode, amount_received
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `;

  const params: unknown[] = [
    payment.sr_no ?? null,
    payment.date,
    payment.received_from ?? null,
    payment.invoice_no ?? null,
    payment.location ?? null,
    payment.work_type ?? null,
    payment.description ?? null,
    payment.payment_mode ?? null,
    payment.amount_received ?? null
  ];

  const meta = await execute(env, sql, params);
  const created = await queryOne<Payment>(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [meta.last_row_id]
  );

  if (created?.invoice_no) {
    const sumRow = await queryOne<{ sum: number }>(
      env,
      "SELECT SUM(amount_received) as sum FROM payments_received WHERE invoice_no = ?",
      [created.invoice_no]
    );
    const sum = sumRow?.sum ?? 0;
    await execute(
      env,
      "UPDATE shoots SET received = ?, balance = COALESCE(amount,0) - ? WHERE invoice_no = ?",
      [sum, sum, created.invoice_no]
    );
  }

  return json(created!);
});

router.post("/api/calculate-coordinator-amount", async (request) => {
  const body = await readJson<{
    date?: string | null;
    number_of_artists: number;
    work_type?: string | null;
    per_day_rate?: number | null;
    work_days?: number | null;
    artists?: string | null;
  }>(request);
  const result = calculateCoordinatorAmount(body);
  return json(result);
});

router.get("/api/availability", async (request, env: Env) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const artistsParam = url.searchParams.get("artists") || "";
  if (!from || !to) {
    return json({ success: false, error: "from and to are required (YYYY-MM-DD)" }, 400);
  }
  const artists = parseArtistList(artistsParam);
  const shoots = await queryAll<Shoot>(
    env,
    "SELECT * FROM shoots WHERE shoot_start_date <= ? AND shoot_end_date >= ?",
    [to, from]
  );
  const vacations = await queryAll<Vacation>(
    env,
    "SELECT * FROM vacations WHERE vacation_end >= ? AND vacation_start <= ?",
    [from, to]
  );
  const result: Record<string, { booked: string[]; vacation: string[]; conflicts: string[] }> = {};
  const start = new Date(from);
  const end = new Date(to);
  const dates: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }
  const setFor = (name: string) => (result[name] ||= { booked: [], vacation: [], conflicts: [] });

  // Mark bookings from shoots
  for (const shoot of shoots) {
    const list = parseArtistList(shoot.artist_provided);
    const s = new Date(shoot.shoot_start_date || from);
    const e = new Date(shoot.shoot_end_date || to);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso < from || iso > to) continue;
      for (const a of list) {
        if (artists.length && !artists.includes(a)) continue;
        const bucket = setFor(a);
        bucket.booked.push(iso);
      }
    }
  }

  // Mark vacations
  for (const vac of vacations) {
    const a = vac.artist ? normalizeArtistName(vac.artist) : undefined;
    if (!a) continue;
    if (artists.length && !artists.includes(a)) continue;
    const s = new Date(vac.vacation_start || from);
    const e = new Date(vac.vacation_end || to);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      if (iso < from || iso > to) continue;
      const bucket = setFor(a);
      bucket.vacation.push(iso);
    }
  }

  // Conflicts
  for (const a of Object.keys(result)) {
    const bucket = result[a];
    const bookedSet = new Set(bucket.booked);
    const vacSet = new Set(bucket.vacation);
    dates.forEach((d) => {
      if (bookedSet.has(d) && vacSet.has(d)) bucket.conflicts.push(d);
    });
    bucket.booked = Array.from(bookedSet).sort();
    bucket.vacation = Array.from(vacSet).sort();
    bucket.conflicts = Array.from(new Set(bucket.conflicts)).sort();
  }

  return json(result);
});

router.patch("/api/payments/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Partial<Payment>;
  try {
    body = await readJson<Partial<Payment>>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const existing = await queryOne<Payment>(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [id]
  );
  if (!existing) {
    return json({ success: false, error: "Not found" }, 404);
  }

  const merged = normalizePayment({ ...existing, ...body });

  const sql = `
    UPDATE payments_received SET
      sr_no = ?,
      date = ?,
      received_from = ?,
      invoice_no = ?,
      location = ?,
      work_type = ?,
      description = ?,
      payment_mode = ?,
      amount_received = ?
    WHERE id = ?
  `;

  const params: unknown[] = [
    merged.sr_no ?? null,
    merged.date ?? existing.date,
    merged.received_from ?? null,
    merged.invoice_no ?? null,
    merged.location ?? null,
    merged.work_type ?? null,
    merged.description ?? null,
    merged.payment_mode ?? null,
    merged.amount_received ?? null,
    id
  ];

  await execute(env, sql, params);

  const updated = await queryOne<Payment>(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [id]
  );
  if (updated?.invoice_no) {
    const sumRow = await queryOne<{ sum: number }>(
      env,
      "SELECT COALESCE(SUM(amount_received),0) as sum FROM payments_received WHERE invoice_no = ?",
      [updated.invoice_no]
    );
    const sum = sumRow?.sum ?? 0;
    await execute(
      env,
      "UPDATE shoots SET received = ?, balance = COALESCE(amount,0) - ? WHERE invoice_no = ?",
      [sum, sum, updated.invoice_no]
    );
  }
  return json(updated!);
});

router.delete("/api/payments/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  const existing = await queryOne<Payment>(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [id]
  );
  await execute(env, "DELETE FROM payments_received WHERE id = ?", [id]);
  if (existing?.invoice_no) {
    const sumRow = await queryOne<{ sum: number }>(
      env,
      "SELECT COALESCE(SUM(amount_received),0) as sum FROM payments_received WHERE invoice_no = ?",
      [existing.invoice_no]
    );
    const sum = sumRow?.sum ?? 0;
    await execute(
      env,
      "UPDATE shoots SET received = ?, balance = COALESCE(amount,0) - ? WHERE invoice_no = ?",
      [sum, sum, existing.invoice_no]
    );
  }
  return json({ success: true });
});

router.get("/api/vacations", async (request, env: Env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);

  const where: string[] = [];
  const params: unknown[] = [];

  const artist = url.searchParams.get("artist");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  if (artist) {
    where.push("artist = ?");
    params.push(normalizeArtistName(artist));
  }
  if (from) {
    where.push("vacation_start >= ?");
    params.push(from);
  }
  if (to) {
    where.push("vacation_end <= ?");
    params.push(to);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: number }>(
    env,
    `SELECT COUNT(*) as count FROM vacations ${whereSql}`,
    params
  );

  const items = await queryAll<Vacation>(
    env,
    `SELECT * FROM vacations ${whereSql} ORDER BY vacation_start DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return json<Paginated<Vacation>>({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});

router.post("/api/vacations", async (request, env: Env) => {
  let body: Vacation;
  try {
    body = await readJson<Vacation>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const vacation = normalizeVacation(body);
  if (!vacation.artist || !vacation.vacation_start || !vacation.vacation_end) {
    return json(
      { success: false, error: "artist and vacation range are required" },
      400
    );
  }

  const sql = `
    INSERT INTO vacations (
      sr_no, artist, vacation_range, reason, vacation_start, vacation_end
    ) VALUES (?,?,?,?,?,?)
  `;

  const params: unknown[] = [
    vacation.sr_no ?? null,
    vacation.artist,
    vacation.vacation_range ?? null,
    vacation.reason ?? null,
    vacation.vacation_start,
    vacation.vacation_end
  ];

  const meta = await execute(env, sql, params);
  const created = await queryOne<Vacation>(
    env,
    "SELECT * FROM vacations WHERE id = ?",
    [meta.last_row_id]
  );

  return json(created!);
});

router.patch("/api/vacations/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Partial<Vacation>;
  try {
    body = await readJson<Partial<Vacation>>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const existing = await queryOne<Vacation>(
    env,
    "SELECT * FROM vacations WHERE id = ?",
    [id]
  );
  if (!existing) {
    return json({ success: false, error: "Not found" }, 404);
  }

  const merged = normalizeVacation({ ...existing, ...body });

  const sql = `
    UPDATE vacations SET
      sr_no = ?,
      artist = ?,
      vacation_range = ?,
      reason = ?,
      vacation_start = ?,
      vacation_end = ?
    WHERE id = ?
  `;

  const params: unknown[] = [
    merged.sr_no ?? null,
    merged.artist ?? existing.artist,
    merged.vacation_range ?? null,
    merged.reason ?? null,
    merged.vacation_start ?? existing.vacation_start,
    merged.vacation_end ?? existing.vacation_end,
    id
  ];

  await execute(env, sql, params);

  const updated = await queryOne<Vacation>(
    env,
    "SELECT * FROM vacations WHERE id = ?",
    [id]
  );

  return json(updated!);
});

router.delete("/api/vacations/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM vacations WHERE id = ?", [id]);
  return json({ success: true });
});

router.get("/api/master-data", async (request, env: Env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);

  const where: string[] = [];
  const params: unknown[] = [];

  const q = url.searchParams.get("q");
  const coordinator = url.searchParams.get("coordinator");
  const artist = url.searchParams.get("artist");
  const paymentMode = url.searchParams.get("payment_mode");

  if (coordinator) {
    where.push("coordinator LIKE ?");
    params.push(`%${coordinator}%`);
  }
  if (artist) {
    where.push("artist = ?");
    params.push(normalizeArtistName(artist));
  }
  if (paymentMode) {
    where.push("payment_mode LIKE ?");
    params.push(`%${paymentMode}%`);
  }

  

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: number }>(
    env,
    `SELECT COUNT(*) as count FROM master_data ${whereSql}`,
    params
  );

  const items = await queryAll<MasterData>(
    env,
    `SELECT * FROM master_data ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  return json<Paginated<MasterData>>({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});

router.post("/api/master-data", async (request, env: Env) => {
  let body: MasterData;
  try {
    body = await readJson<MasterData>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const record = normalizeMasterData(body);

  const sql = `
    INSERT INTO master_data (
      payment_mode, coordinator, artist, work_type, month, year, expense_category
    ) VALUES (?,?,?,?,?,?,?)
  `;

  const params: unknown[] = [
    record.payment_mode ?? null,
    record.coordinator ?? null,
    record.artist ?? null,
    record.work_type ?? null,
    record.month ?? null,
    record.year ?? null,
    record.expense_category ?? null
  ];

  const meta = await execute(env, sql, params);
  const created = await queryOne<MasterData>(
    env,
    "SELECT * FROM master_data WHERE id = ?",
    [meta.last_row_id]
  );

  return json(created!);
});

router.patch("/api/master-data/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  let body: Partial<MasterData>;
  try {
    body = await readJson<Partial<MasterData>>(request);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }

  const existing = await queryOne<MasterData>(
    env,
    "SELECT * FROM master_data WHERE id = ?",
    [id]
  );
  if (!existing) {
    return json({ success: false, error: "Not found" }, 404);
  }

  const merged = normalizeMasterData({ ...existing, ...body });

  const sql = `
    UPDATE master_data SET
      payment_mode = ?,
      coordinator = ?,
      artist = ?,
      work_type = ?,
      month = ?,
      year = ?,
      expense_category = ?
    WHERE id = ?
  `;

  const params: unknown[] = [
    merged.payment_mode ?? null,
    merged.coordinator ?? null,
    merged.artist ?? null,
    merged.work_type ?? null,
    merged.month ?? null,
    merged.year ?? null,
    merged.expense_category ?? null,
    id
  ];

  await execute(env, sql, params);

  const updated = await queryOne<MasterData>(
    env,
    "SELECT * FROM master_data WHERE id = ?",
    [id]
  );

  return json(updated!);
});

router.delete("/api/master-data/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM master_data WHERE id = ?", [id]);
  return json({ success: true });
});

router.get("/api/roaster-entries", async (request, env: Env) => {
  const url = new URL(request.url);
  const where: string[] = [];
  const params: unknown[] = [];

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const artist = url.searchParams.get("artist");

  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }
  if (artist) {
    where.push("artist = ?");
    params.push(normalizeArtistName(artist));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const entries = await queryAll<RoasterEntry>(
    env,
    `SELECT * FROM roaster_entries ${whereSql} ORDER BY date ASC, artist ASC`,
    params
  );

  return json(entries);
});


router.delete("/api/shoots/:id", async (request, env: Env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }

  await execute(env, "DELETE FROM shoots WHERE id = ?", [id]);
  return json({ success: true });
});

router.get("/api/artists", async (_request, env: Env) => {
  const fromMaster = await queryAll<{ artist: string }>(
    env,
    "SELECT DISTINCT UPPER(TRIM(artist)) as artist FROM master_data WHERE artist IS NOT NULL AND TRIM(artist) <> ''"
  );

  const fromShoots = await queryAll<{ artist_provided: string }>(
    env,
    "SELECT DISTINCT artist_provided FROM shoots WHERE artist_provided IS NOT NULL"
  );

  const set = new Set<string>();
  fromMaster.forEach((row) => {
    if (row.artist) set.add(row.artist);
  });
  fromShoots.forEach((row) => {
    parseArtistList(row.artist_provided).forEach((artist) => set.add(artist));
  });

  const artists = Array.from(set).sort();
  return json<string[]>({ success: true, data: artists });
});

router.post("/api/roaster-generate", async (request, env: Env) => {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "", 10);
  const year = parseInt(url.searchParams.get("year") || "", 10);

  if (!month || !year) {
    return json(
      { success: false, error: "month and year query params are required" },
      400
    );
  }

  const monthStr = month.toString().padStart(2, "0");
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-31`;

  const shoots = await queryAll<Shoot>(
    env,
    "SELECT * FROM shoots WHERE shoot_start_date <= ? AND shoot_end_date >= ?",
    [end, start]
  );

  const vacations = await queryAll<Vacation>(
    env,
    "SELECT * FROM vacations WHERE vacation_end >= ? AND vacation_start <= ?",
    [start, end]
  );

  const result = buildRoasterMatrix(shoots, vacations, month, year);

  const statements: { sql: string; params: unknown[] }[] = [
    {
      sql: "DELETE FROM roaster_entries WHERE date BETWEEN ? AND ?",
      params: [start, end]
    },
    ...result.entries.map((entry) => ({
      sql: `
        INSERT INTO roaster_entries (
          date, artist, source_invoice, coordinator, location,
          work_type, description, role
        ) VALUES (?,?,?,?,?,?,?,?)
      `,
      params: [
        entry.date,
        entry.artist,
        entry.source_invoice,
        entry.coordinator ?? null,
        entry.location ?? null,
        entry.work_type ?? null,
        entry.description ?? null,
        null
      ]
    }))
  ];

  await transaction(env, statements);

  return json({
    month,
    year,
    artists: result.artists,
    dates: result.dates,
    matrix: result.matrix
  });
});

router.get("/api/summary", async (request, env: Env) => {
  const url = new URL(request.url);
  const month = parseInt(url.searchParams.get("month") || "", 10);
  const year = parseInt(url.searchParams.get("year") || "", 10);

  if (!month || !year) {
    return json(
      { success: false, error: "month and year query params are required" },
      400
    );
  }

  const monthStr = month.toString().padStart(2, "0");
  const start = `${year}-${monthStr}-01`;
  const end = `${year}-${monthStr}-31`;

  const [{ total_shoots = 0 } = {}] = await queryAll<{
    total_shoots: number;
  }>(
    env,
    "SELECT COUNT(*) as total_shoots FROM shoots WHERE inv_date BETWEEN ? AND ?",
    [start, end]
  );

  const [{ total_payments = 0 } = {}] = await queryAll<{
    total_payments: number;
  }>(
    env,
    "SELECT COALESCE(SUM(amount_received),0) as total_payments FROM payments_received WHERE date BETWEEN ? AND ?",
    [start, end]
  );

  const [{ total_expenses = 0 } = {}] = await queryAll<{
    total_expenses: number;
  }>(
    env,
    "SELECT COALESCE(SUM(amount_out - amount_in),0) as total_expenses FROM expenses WHERE date BETWEEN ? AND ?",
    [start, end]
  );

  const net_balance = total_payments - total_expenses;

  await execute(
    env,
    `
      INSERT INTO summary (
        month, year, total_shoots, total_payments, total_expenses, net_balance
      ) VALUES (?,?,?,?,?,?)
    `,
    [month, year, total_shoots, total_payments, total_expenses, net_balance]
  );

  const latest = await queryOne<Summary>(
    env,
    `
      SELECT *
      FROM summary
      WHERE month = ? AND year = ?
      ORDER BY generated_at DESC
      LIMIT 1
    `,
    [month, year]
  );

  return json<Summary>({ success: true, data: latest! });
});

router.get("/api/yearly-summary", async (request, env: Env) => {
  const url = new URL(request.url);
  const year = parseInt(url.searchParams.get("year") || "", 10);
  if (!year) {
    return json({ success: false, error: "year query param is required" }, 400);
  }

  const yearStr = year.toString();
  const prevYearStr = (year - 1).toString();

  const [{ rev = 0 } = {}] = await queryAll<{ rev: number }>(
    env,
    "SELECT COALESCE(SUM(amount_received),0) as rev FROM payments_received WHERE strftime('%Y', date) = ?",
    [yearStr]
  );
  const [{ exp = 0 } = {}] = await queryAll<{ exp: number }>(
    env,
    "SELECT COALESCE(SUM(amount_out - amount_in),0) as exp FROM expenses WHERE strftime('%Y', date) = ?",
    [yearStr]
  );
  const [{ shoots = 0 } = {}] = await queryAll<{ shoots: number }>(
    env,
    "SELECT COUNT(*) as shoots FROM shoots WHERE strftime('%Y', inv_date) = ?",
    [yearStr]
  );

  const monthlyPayments = await queryAll<{ m: string; total: number }>(
    env,
    "SELECT strftime('%m', date) as m, COALESCE(SUM(amount_received),0) as total FROM payments_received WHERE strftime('%Y', date) = ? GROUP BY m ORDER BY m",
    [yearStr]
  );
  const monthlyExpenses = await queryAll<{ m: string; total: number }>(
    env,
    "SELECT strftime('%m', date) as m, COALESCE(SUM(amount_out - amount_in),0) as total FROM expenses WHERE strftime('%Y', date) = ? GROUP BY m ORDER BY m",
    [yearStr]
  );
  const monthlyShoots = await queryAll<{ m: string; total: number }>(
    env,
    "SELECT strftime('%m', inv_date) as m, COUNT(*) as total FROM shoots WHERE strftime('%Y', inv_date) = ? GROUP BY m ORDER BY m",
    [yearStr]
  );

  const topClients = await queryAll<{ name: string | null; total: number }>(
    env,
    "SELECT received_from as name, COALESCE(SUM(amount_received),0) as total FROM payments_received WHERE strftime('%Y', date) = ? AND received_from IS NOT NULL GROUP BY received_from ORDER BY total DESC LIMIT 5",
    [yearStr]
  );
  const topExpenseCats = await queryAll<{ name: string | null; total: number }>(
    env,
    "SELECT category as name, COALESCE(SUM(amount_out - amount_in),0) as total FROM expenses WHERE strftime('%Y', date) = ? AND category IS NOT NULL GROUP BY category ORDER BY total DESC LIMIT 5",
    [yearStr]
  );

  const [{ prev_rev = 0 } = {}] = await queryAll<{ prev_rev: number }>(
    env,
    "SELECT COALESCE(SUM(amount_received),0) as prev_rev FROM payments_received WHERE strftime('%Y', date) = ?",
    [prevYearStr]
  );
  const [{ prev_exp = 0 } = {}] = await queryAll<{ prev_exp: number }>(
    env,
    "SELECT COALESCE(SUM(amount_out - amount_in),0) as prev_exp FROM expenses WHERE strftime('%Y', date) = ?",
    [prevYearStr]
  );

  const profit = rev - exp;
  const prevProfit = prev_rev - prev_exp;

  const growthPct = (cur: number, prev: number) => {
    if (!prev) return cur ? 100 : 0;
    return ((cur - prev) / Math.abs(prev)) * 100;
  };

  return json({
    year,
    totals: {
      revenue: rev,
      expenses: exp,
      profit,
      shoots
    },
    monthly: {
      revenue: monthlyPayments,
      expenses: monthlyExpenses,
      shoots: monthlyShoots
    },
    top_clients: topClients,
    top_expenses: topExpenseCats,
    compare_prev_year: {
      revenue: { current: rev, previous: prev_rev, growth_pct: growthPct(rev, prev_rev) },
      expenses: { current: exp, previous: prev_exp, growth_pct: growthPct(exp, prev_exp) },
      profit: { current: profit, previous: prevProfit, growth_pct: growthPct(profit, prevProfit) }
    }
  });
});

router.all("*", () =>
  json({ success: false, error: "Not found" }, 404)
);

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext) {
    try {
      const res = await router.handle(request, env, _ctx);
      if (res instanceof Response) {
        return withCors(request, env, res);
      }
      return withCors(request, env, json({ success: false, error: "Not found" }, 404));
    } catch (error) {
      return withCors(
        request,
        env,
        json(
          {
            success: false,
            error:
              error instanceof Error ? error.message : "Unexpected error"
          },
          500
        )
      );
    }
  }
};
 
