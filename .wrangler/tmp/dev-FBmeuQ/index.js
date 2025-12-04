var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/node_modules/itty-router/index.mjs
var e = /* @__PURE__ */ __name(({ base: e2 = "", routes: t = [], ...o2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((o3, s2, r, n) => "handle" == s2 ? r.fetch : (o4, ...a) => t.push([s2.toUpperCase?.(), RegExp(`^${(n = (e2 + o4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), a, n]) && r, "get") }), routes: t, ...o2, async fetch(e3, ...o3) {
  let s2, r, n = new URL(e3.url), a = e3.query = { __proto__: null };
  for (let [e4, t2] of n.searchParams) a[e4] = a[e4] ? [].concat(a[e4], t2) : t2;
  for (let [a2, c2, i2, l2] of t) if ((a2 == e3.method || "ALL" == a2) && (r = n.pathname.match(c2))) {
    e3.params = r.groups || {}, e3.route = l2;
    for (let t2 of i2) if (null != (s2 = await t2(e3.proxy ?? e3, ...o3))) return s2;
  }
} }), "e");
var o = /* @__PURE__ */ __name((e2 = "text/plain; charset=utf-8", t) => (o2, { headers: s2 = {}, ...r } = {}) => void 0 === o2 || "Response" === o2?.constructor.name ? o2 : new Response(t ? t(o2) : o2, { headers: { "content-type": e2, ...s2.entries ? Object.fromEntries(s2) : s2 }, ...r }), "o");
var s = o("application/json; charset=utf-8", JSON.stringify);
var c = o("text/plain; charset=utf-8", String);
var i = o("text/html");
var l = o("image/jpeg");
var p = o("image/png");
var d = o("image/webp");

// worker/db.ts
function getDb(env) {
  const db = env.DB ?? env.roaster_app;
  if (!db) {
    throw new Error("D1 binding not configured. Expected DB or roaster_app.");
  }
  return db;
}
__name(getDb, "getDb");
async function queryAll(env, sql, params = []) {
  const stmt = getDb(env).prepare(sql).bind(...params);
  const { results } = await stmt.all();
  return results ?? [];
}
__name(queryAll, "queryAll");
async function queryOne(env, sql, params = []) {
  const items = await queryAll(env, sql, params);
  return items[0] ?? null;
}
__name(queryOne, "queryOne");
async function execute(env, sql, params = []) {
  const stmt = getDb(env).prepare(sql).bind(...params);
  const { meta } = await stmt.run();
  return meta;
}
__name(execute, "execute");
async function transaction(env, statements) {
  const db = getDb(env);
  const prepared = statements.map(
    ({ sql, params = [] }) => db.prepare(sql).bind(...params)
  );
  await db.batch(prepared);
}
__name(transaction, "transaction");

// worker/logic.ts
function parseNumber(value) {
  if (value === null || value === void 0 || value === "") return void 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : void 0;
}
__name(parseNumber, "parseNumber");
function parseIsoDate(value) {
  if (!value) return void 0;
  const str = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return void 0;
  return str;
}
__name(parseIsoDate, "parseIsoDate");
function parseRangeToIso(range) {
  const match = range.match(
    /(\d{2})-(\d{2})-(\d{4})\s*TO\s*(\d{2})-(\d{2})-(\d{4})/i
  );
  if (!match) {
    return null;
  }
  const [, d1, m1, y1, d2, m2, y2] = match;
  return {
    start: `${y1}-${m1}-${d1}`,
    end: `${y2}-${m2}-${d2}`
  };
}
__name(parseRangeToIso, "parseRangeToIso");
function normalizeArtistName(name) {
  return name.trim().toUpperCase();
}
__name(normalizeArtistName, "normalizeArtistName");
function parseArtistList(input) {
  if (!input) return [];
  return input.split(/[;,]/).map((token) => normalizeArtistName(token)).filter(Boolean);
}
__name(parseArtistList, "parseArtistList");
function computeShootDerivedFields(input) {
  const result = { ...input };
  if (input.shoot_dates && (!input.shoot_start_date || !input.shoot_end_date)) {
    const range = parseRangeToIso(String(input.shoot_dates));
    if (range) {
      result.shoot_start_date = range.start;
      result.shoot_end_date = range.end;
      result.inv_date = result.inv_date ?? range.start;
    }
  }
  const perDay = parseNumber(input.per_day_rate);
  const days = parseNumber(input.work_days);
  let artists = parseNumber(input.total_artists);
  const amount = parseNumber(input.amount);
  const received = parseNumber(input.received);
  if (input.artist_provided) {
    const artistsList = parseArtistList(input.artist_provided);
    result.artist_provided = artistsList.join(", ");
    if (!artists || artistsList.length > (artists ?? 0)) {
      artists = artistsList.length;
    }
    result.total_artists = artists;
  } else if (artists) {
    result.total_artists = artists;
  }
  if (perDay !== void 0 && days !== void 0 && artists !== void 0) {
    result.amount = perDay * days * artists;
  } else if (amount !== void 0) {
    result.amount = amount;
  }
  if (result.amount !== void 0 && result.amount !== null) {
    const rec = received ?? 0;
    const amt = Number(result.amount ?? 0);
    result.received = rec;
    result.balance = amt - rec;
    if (amt > 0) {
      if ((result.balance ?? 0) === 0) {
        result.status = "PAID";
      } else if (rec > 0) {
        result.status = "PARTIAL";
      } else {
        result.status = result.status ?? "PENDING";
      }
    }
  }
  if (input.inv_date) {
    const parsed = parseIsoDate(input.inv_date);
    if (parsed) {
      result.inv_date = parsed;
    }
  }
  return result;
}
__name(computeShootDerivedFields, "computeShootDerivedFields");
function expandDateRange(from, to) {
  const result = [];
  const startDate = new Date(from);
  const endDate = new Date(to);
  for (let d2 = new Date(startDate); d2 <= endDate; d2.setDate(d2.getDate() + 1)) {
    const iso = d2.toISOString().slice(0, 10);
    result.push(iso);
  }
  return result;
}
__name(expandDateRange, "expandDateRange");
function buildRoasterMatrix(shoots, vacations, month, year) {
  const monthStr = month.toString().padStart(2, "0");
  const matrix = {};
  const entries = [];
  const dateSet = /* @__PURE__ */ new Set();
  const artistSet = /* @__PURE__ */ new Set();
  const addDate = /* @__PURE__ */ __name((date) => {
    if (!date.startsWith(`${year}-${monthStr}-`)) return false;
    if (!dateSet.has(date)) {
      dateSet.add(date);
    }
    return true;
  }, "addDate");
  const addCell = /* @__PURE__ */ __name((date, artist, type, details) => {
    if (!matrix[date]) matrix[date] = {};
    const current = matrix[date][artist];
    if (!current) {
      matrix[date][artist] = { type, details };
    } else if (current.type !== type) {
      matrix[date][artist] = {
        type: "CONFLICT",
        details: { existing: current, incoming: { type, details } }
      };
    }
  }, "addCell");
  for (const shoot of shoots) {
    if (!shoot.shoot_start_date || !shoot.shoot_end_date) continue;
    const artistList = parseArtistList(shoot.artist_provided);
    artistList.forEach((artist) => artistSet.add(artist));
    const dates = expandDateRange(shoot.shoot_start_date, shoot.shoot_end_date);
    for (const date of dates) {
      if (!addDate(date)) continue;
      for (const artist of artistList) {
        addCell(date, artist, "BOOKED", {
          invoice_no: shoot.invoice_no,
          work_type: shoot.work_type,
          location: shoot.location
        });
        entries.push({
          date,
          artist,
          source_invoice: shoot.invoice_no,
          coordinator: shoot.coordinator ?? null,
          location: shoot.location ?? null,
          work_type: shoot.work_type ?? null,
          description: shoot.description ?? null
        });
      }
    }
  }
  for (const vacation of vacations) {
    if (!vacation.vacation_start || !vacation.vacation_end || !vacation.artist)
      continue;
    const artist = normalizeArtistName(vacation.artist);
    artistSet.add(artist);
    const dates = expandDateRange(vacation.vacation_start, vacation.vacation_end);
    for (const date of dates) {
      if (!addDate(date)) continue;
      addCell(date, artist, "VACATION", {
        reason: vacation.reason
      });
    }
  }
  return {
    artists: Array.from(artistSet).sort(),
    dates: Array.from(dateSet).sort(),
    matrix,
    entries
  };
}
__name(buildRoasterMatrix, "buildRoasterMatrix");
function calculateCoordinatorAmount(params) {
  const n = parseNumber(params.number_of_artists) ?? 0;
  const rate = parseNumber(params.per_day_rate) ?? 0;
  const days = parseNumber(params.work_days) ?? 1;
  const total = n * rate * days;
  const perDay = rate * n;
  const list = parseArtistList(params.artists);
  const perArtistAmount = n > 0 ? total / n : 0;
  const breakdown = (list.length ? list : Array.from({ length: n }, (_, i2) => `ARTIST_${i2 + 1}`)).map((name) => ({
    artist: name,
    amount: perArtistAmount
  }));
  return {
    date: params.date ?? null,
    work_type: params.work_type ?? null,
    number_of_artists: n,
    per_day_rate: rate,
    work_days: days,
    total,
    per_day: perDay,
    breakdown
  };
}
__name(calculateCoordinatorAmount, "calculateCoordinatorAmount");

// worker/index.ts
var router = e();
var DEFAULT_PAGE_SIZE = 25;
var MAX_PAGE_SIZE = 200;
function json(body, status = 200) {
  const payload = body && typeof body === "object" && "success" in body ? body : { success: true, data: body };
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
__name(json, "json");
async function readJson(request) {
  const text = await request.text();
  if (!text) throw new Error("Empty JSON body");
  return JSON.parse(text);
}
__name(readJson, "readJson");
function withCors(request, env, response) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS?.split(",").map((o2) => o2.trim()) ?? ["*"];
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
__name(withCors, "withCors");
function getPagination(url) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const rawPageSize = parseInt(
    url.searchParams.get("pageSize") || `${DEFAULT_PAGE_SIZE}`,
    10
  );
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
__name(getPagination, "getPagination");
function normalizeExpense(input) {
  const result = { ...input };
  const iso = parseIsoDate(input.date);
  if (iso) result.date = iso;
  const out = parseNumber(input.amount_out);
  const inc = parseNumber(input.amount_in);
  if (out !== void 0) result.amount_out = out;
  if (inc !== void 0) result.amount_in = inc;
  if (out !== void 0 || inc !== void 0) {
    result.total_expense = result.total_expense ?? (out ?? 0) - (inc ?? 0);
  }
  if (input.paid_for_artist) {
    result.paid_for_artist = normalizeArtistName(input.paid_for_artist);
  }
  if (input.sr_no !== void 0) {
    const serial = parseNumber(input.sr_no);
    if (serial !== void 0) result.sr_no = serial;
  }
  return result;
}
__name(normalizeExpense, "normalizeExpense");
function normalizePayment(input) {
  const result = { ...input };
  const iso = parseIsoDate(input.date);
  if (iso) result.date = iso;
  const serial = parseNumber(input.sr_no);
  if (serial !== void 0) result.sr_no = serial;
  const amount = parseNumber(input.amount_received);
  if (amount !== void 0) result.amount_received = amount;
  if (result.payment_mode) {
    result.payment_mode = result.payment_mode.trim().toUpperCase();
  }
  return result;
}
__name(normalizePayment, "normalizePayment");
function normalizeVacation(input) {
  const result = { ...input };
  if (input.artist) {
    result.artist = normalizeArtistName(input.artist);
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
  if (serial !== void 0) result.sr_no = serial;
  return result;
}
__name(normalizeVacation, "normalizeVacation");
function normalizeMasterData(input) {
  const result = { ...input };
  if (result.artist) {
    result.artist = normalizeArtistName(result.artist);
  }
  if (result.coordinator) {
    result.coordinator = result.coordinator.trim();
  }
  if (result.payment_mode) {
    result.payment_mode = result.payment_mode.trim().toUpperCase();
  }
  const year = parseNumber(result.year);
  if (year !== void 0) result.year = year;
  return result;
}
__name(normalizeMasterData, "normalizeMasterData");
router.options(
  "*",
  () => new Response(null, {
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
      "/api/roaster-entries",
      "/api/summary"
    ]
  });
});
router.get("/api/health", async (_request, env) => {
  const ok = await queryOne(env, "SELECT 1 as ok", []);
  return json({ ok: ok?.ok === 1 });
});
router.get("/api/shoots", async (request, env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);
  const where = [];
  const params = [];
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
  const totalRow = await queryOne(
    env,
    `SELECT COUNT(*) as count FROM shoots ${whereSql}`,
    params
  );
  const total = totalRow?.count ?? 0;
  const items = await queryAll(
    env,
    `SELECT * FROM shoots ${whereSql} ORDER BY inv_date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const payload = {
    items,
    page,
    pageSize,
    total
  };
  return json(payload);
});
router.get("/api/shoots/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  const shoot = await queryOne(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  if (!shoot) {
    return json({ success: false, error: "Not found" }, 404);
  }
  return json({ success: true, data: shoot });
});
router.post("/api/shoots", async (request, env) => {
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  if (!body.invoice_no) {
    return json({ success: false, error: "invoice_no is required" }, 400);
  }
  const existing = await queryOne(
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
  const params = [
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
  const meta = await execute(env, sql, params);
  const created = await queryOne(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [meta.last_row_id]
  );
  return json({ success: true, data: created }, 201);
});
router.put("/api/shoots/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
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
  const params = [
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
  await execute(env, sql, params);
  const updated = await queryOne(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  return json({ success: true, data: updated });
});
router.patch("/api/shoots/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const existing = await queryOne(
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
  const params = [
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
  const updated = await queryOne(
    env,
    "SELECT * FROM shoots WHERE id = ?",
    [id]
  );
  return json({ success: true, data: updated });
});
router.get("/api/expenses", async (request, env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);
  const where = [];
  const params = [];
  const invoice = url.searchParams.get("invoice_no");
  const category = url.searchParams.get("category");
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
  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await queryOne(
    env,
    `SELECT COUNT(*) as count FROM expenses ${whereSql}`,
    params
  );
  const items = await queryAll(
    env,
    `SELECT * FROM expenses ${whereSql} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return json({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});
router.post("/api/expenses", async (request, env) => {
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const expense = normalizeExpense(body);
  if (!expense.date) {
    return json({ success: false, error: "date is required" }, 400);
  }
  const sql = `
    INSERT INTO expenses (
      sr_no, date, description, paid_for_artist, category, mode,
      invoice_no, amount_out, amount_in, total_expense
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `;
  const params = [
    expense.sr_no ?? null,
    expense.date,
    expense.description ?? null,
    expense.paid_for_artist ?? null,
    expense.category ?? null,
    expense.mode ?? null,
    expense.invoice_no ?? null,
    expense.amount_out ?? null,
    expense.amount_in ?? null,
    expense.total_expense ?? null
  ];
  const meta = await execute(env, sql, params);
  const created = await queryOne(
    env,
    "SELECT * FROM expenses WHERE id = ?",
    [meta.last_row_id]
  );
  return json(created);
});
router.patch("/api/expenses/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const existing = await queryOne(
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
      paid_for_artist = ?,
      category = ?,
      mode = ?,
      invoice_no = ?,
      amount_out = ?,
      amount_in = ?,
      total_expense = ?
    WHERE id = ?
  `;
  const params = [
    merged.sr_no ?? null,
    merged.date ?? existing.date,
    merged.description ?? null,
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
  const updated = await queryOne(
    env,
    "SELECT * FROM expenses WHERE id = ?",
    [id]
  );
  return json(updated);
});
router.delete("/api/expenses/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM expenses WHERE id = ?", [id]);
  return json({ success: true });
});
router.get("/api/payments", async (request, env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);
  const where = [];
  const params = [];
  const invoice = url.searchParams.get("invoice_no");
  const mode = url.searchParams.get("payment_mode");
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
  if (from) {
    where.push("date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("date <= ?");
    params.push(to);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const totalRow = await queryOne(
    env,
    `SELECT COUNT(*) as count FROM payments_received ${whereSql}`,
    params
  );
  const items = await queryAll(
    env,
    `SELECT * FROM payments_received ${whereSql} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return json({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});
router.post("/api/payments", async (request, env) => {
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
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
  const params = [
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
  const created = await queryOne(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [meta.last_row_id]
  );
  if (created?.invoice_no) {
    const sumRow = await queryOne(
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
  return json(created);
});
router.post("/api/calculate-coordinator-amount", async (request) => {
  const body = await readJson(request);
  const result = calculateCoordinatorAmount(body);
  return json(result);
});
router.get("/api/availability", async (request, env) => {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const artistsParam = url.searchParams.get("artists") || "";
  if (!from || !to) {
    return json({ success: false, error: "from and to are required (YYYY-MM-DD)" }, 400);
  }
  const artists = parseArtistList(artistsParam);
  const shoots = await queryAll(
    env,
    "SELECT * FROM shoots WHERE shoot_start_date <= ? AND shoot_end_date >= ?",
    [to, from]
  );
  const vacations = await queryAll(
    env,
    "SELECT * FROM vacations WHERE vacation_end >= ? AND vacation_start <= ?",
    [from, to]
  );
  const result = {};
  const start = new Date(from);
  const end = new Date(to);
  const dates = [];
  for (let d2 = new Date(start); d2 <= end; d2.setDate(d2.getDate() + 1)) {
    dates.push(d2.toISOString().slice(0, 10));
  }
  const setFor = /* @__PURE__ */ __name((name) => result[name] ||= { booked: [], vacation: [], conflicts: [] }, "setFor");
  for (const shoot of shoots) {
    const list = parseArtistList(shoot.artist_provided);
    const s2 = new Date(shoot.shoot_start_date || from);
    const e2 = new Date(shoot.shoot_end_date || to);
    for (let d2 = new Date(s2); d2 <= e2; d2.setDate(d2.getDate() + 1)) {
      const iso = d2.toISOString().slice(0, 10);
      if (iso < from || iso > to) continue;
      for (const a of list) {
        if (artists.length && !artists.includes(a)) continue;
        const bucket = setFor(a);
        bucket.booked.push(iso);
      }
    }
  }
  for (const vac of vacations) {
    const a = vac.artist ? normalizeArtistName(vac.artist) : void 0;
    if (!a) continue;
    if (artists.length && !artists.includes(a)) continue;
    const s2 = new Date(vac.vacation_start || from);
    const e2 = new Date(vac.vacation_end || to);
    for (let d2 = new Date(s2); d2 <= e2; d2.setDate(d2.getDate() + 1)) {
      const iso = d2.toISOString().slice(0, 10);
      if (iso < from || iso > to) continue;
      const bucket = setFor(a);
      bucket.vacation.push(iso);
    }
  }
  for (const a of Object.keys(result)) {
    const bucket = result[a];
    const bookedSet = new Set(bucket.booked);
    const vacSet = new Set(bucket.vacation);
    dates.forEach((d2) => {
      if (bookedSet.has(d2) && vacSet.has(d2)) bucket.conflicts.push(d2);
    });
    bucket.booked = Array.from(bookedSet).sort();
    bucket.vacation = Array.from(vacSet).sort();
    bucket.conflicts = Array.from(new Set(bucket.conflicts)).sort();
  }
  return json(result);
});
router.patch("/api/payments/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const existing = await queryOne(
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
  const params = [
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
  const updated = await queryOne(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [id]
  );
  if (updated?.invoice_no) {
    const sumRow = await queryOne(
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
  return json(updated);
});
router.delete("/api/payments/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  const existing = await queryOne(
    env,
    "SELECT * FROM payments_received WHERE id = ?",
    [id]
  );
  await execute(env, "DELETE FROM payments_received WHERE id = ?", [id]);
  if (existing?.invoice_no) {
    const sumRow = await queryOne(
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
router.get("/api/vacations", async (request, env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);
  const where = [];
  const params = [];
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
  const totalRow = await queryOne(
    env,
    `SELECT COUNT(*) as count FROM vacations ${whereSql}`,
    params
  );
  const items = await queryAll(
    env,
    `SELECT * FROM vacations ${whereSql} ORDER BY vacation_start DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return json({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});
router.post("/api/vacations", async (request, env) => {
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
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
  const params = [
    vacation.sr_no ?? null,
    vacation.artist,
    vacation.vacation_range ?? null,
    vacation.reason ?? null,
    vacation.vacation_start,
    vacation.vacation_end
  ];
  const meta = await execute(env, sql, params);
  const created = await queryOne(
    env,
    "SELECT * FROM vacations WHERE id = ?",
    [meta.last_row_id]
  );
  return json(created);
});
router.patch("/api/vacations/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const existing = await queryOne(
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
  const params = [
    merged.sr_no ?? null,
    merged.artist ?? existing.artist,
    merged.vacation_range ?? null,
    merged.reason ?? null,
    merged.vacation_start ?? existing.vacation_start,
    merged.vacation_end ?? existing.vacation_end,
    id
  ];
  await execute(env, sql, params);
  const updated = await queryOne(
    env,
    "SELECT * FROM vacations WHERE id = ?",
    [id]
  );
  return json(updated);
});
router.delete("/api/vacations/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM vacations WHERE id = ?", [id]);
  return json({ success: true });
});
router.get("/api/master-data", async (request, env) => {
  const url = new URL(request.url);
  const { page, pageSize, offset } = getPagination(url);
  const where = [];
  const params = [];
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
  const totalRow = await queryOne(
    env,
    `SELECT COUNT(*) as count FROM master_data ${whereSql}`,
    params
  );
  const items = await queryAll(
    env,
    `SELECT * FROM master_data ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return json({
    items,
    page,
    pageSize,
    total: totalRow?.count ?? 0
  });
});
router.post("/api/master-data", async (request, env) => {
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const record = normalizeMasterData(body);
  const sql = `
    INSERT INTO master_data (
      payment_mode, coordinator, artist, work_type, month, year, expense_category
    ) VALUES (?,?,?,?,?,?,?)
  `;
  const params = [
    record.payment_mode ?? null,
    record.coordinator ?? null,
    record.artist ?? null,
    record.work_type ?? null,
    record.month ?? null,
    record.year ?? null,
    record.expense_category ?? null
  ];
  const meta = await execute(env, sql, params);
  const created = await queryOne(
    env,
    "SELECT * FROM master_data WHERE id = ?",
    [meta.last_row_id]
  );
  return json(created);
});
router.patch("/api/master-data/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }
  const existing = await queryOne(
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
  const params = [
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
  const updated = await queryOne(
    env,
    "SELECT * FROM master_data WHERE id = ?",
    [id]
  );
  return json(updated);
});
router.delete("/api/master-data/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM master_data WHERE id = ?", [id]);
  return json({ success: true });
});
router.get("/api/roaster-entries", async (request, env) => {
  const url = new URL(request.url);
  const where = [];
  const params = [];
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
  const entries = await queryAll(
    env,
    `SELECT * FROM roaster_entries ${whereSql} ORDER BY date ASC, artist ASC`,
    params
  );
  return json(entries);
});
router.delete("/api/shoots/:id", async (request, env) => {
  const id = Number(request.params?.id);
  if (!Number.isFinite(id)) {
    return json({ success: false, error: "Invalid id" }, 400);
  }
  await execute(env, "DELETE FROM shoots WHERE id = ?", [id]);
  return json({ success: true });
});
router.get("/api/artists", async (_request, env) => {
  const fromMaster = await queryAll(
    env,
    "SELECT DISTINCT UPPER(TRIM(artist)) as artist FROM master_data WHERE artist IS NOT NULL AND TRIM(artist) <> ''"
  );
  const fromShoots = await queryAll(
    env,
    "SELECT DISTINCT artist_provided FROM shoots WHERE artist_provided IS NOT NULL"
  );
  const set = /* @__PURE__ */ new Set();
  fromMaster.forEach((row) => {
    if (row.artist) set.add(row.artist);
  });
  fromShoots.forEach((row) => {
    parseArtistList(row.artist_provided).forEach((artist) => set.add(artist));
  });
  const artists = Array.from(set).sort();
  return json({ success: true, data: artists });
});
router.post("/api/roaster-generate", async (request, env) => {
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
  const shoots = await queryAll(
    env,
    "SELECT * FROM shoots WHERE shoot_start_date <= ? AND shoot_end_date >= ?",
    [end, start]
  );
  const vacations = await queryAll(
    env,
    "SELECT * FROM vacations WHERE vacation_end >= ? AND vacation_start <= ?",
    [start, end]
  );
  const result = buildRoasterMatrix(shoots, vacations, month, year);
  const statements = [
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
router.get("/api/summary", async (request, env) => {
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
  const [{ total_shoots = 0 } = {}] = await queryAll(
    env,
    "SELECT COUNT(*) as total_shoots FROM shoots WHERE inv_date BETWEEN ? AND ?",
    [start, end]
  );
  const [{ total_payments = 0 } = {}] = await queryAll(
    env,
    "SELECT COALESCE(SUM(amount_received),0) as total_payments FROM payments_received WHERE date BETWEEN ? AND ?",
    [start, end]
  );
  const [{ total_expenses = 0 } = {}] = await queryAll(
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
  const latest = await queryOne(
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
  return json({ success: true, data: latest });
});
router.all(
  "*",
  () => json({ success: false, error: "Not found" }, 404)
);
var worker_default = {
  async fetch(request, env, _ctx) {
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
            error: error instanceof Error ? error.message : "Unexpected error"
          },
          500
        )
      );
    }
  }
};

// worker/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e2) {
      console.error("Failed to drain the unused request body.", e2);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-4sqNoF/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_default;

// worker/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-4sqNoF/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
