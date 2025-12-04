import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const AUTH_USER = "CINEFLAKES";
const SALT = "cf_salt_v1";
const SECRET = process.env.AUTH_SECRET || "dev-secret";
const TIMEOUT_MS = 10 * 60 * 1000;
const RL_WINDOW_MS = 5 * 60 * 1000;
const RL_MAX = 10;

type Attempt = { count: number; reset: number };
const attemptsStore: Map<string, Attempt> = new Map<string, Attempt>();

function getClientKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ua = req.headers.get("user-agent") || "";
  return `${ip}:${ua.slice(0, 40)}`;
}

function checkRateLimit(req: NextRequest): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const cur = attemptsStore.get(key);
  if (!cur || cur.reset < now) {
    attemptsStore.set(key, { count: 1, reset: now + RL_WINDOW_MS });
    return true;
  }
  if (cur.count >= RL_MAX) return false;
  cur.count += 1;
  attemptsStore.set(key, cur);
  return true;
}

function hashPassword(password: string): string {
  const key = crypto.scryptSync(password, SALT, 32);
  return key.toString("base64");
}

const HASHED = hashPassword("CINE@1212");

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
}

function issueSession(uid: string) {
  const payload = { uid, last: Date.now() };
  const json = JSON.stringify(payload);
  const sig = sign(json);
  const token = `${Buffer.from(json).toString("base64url")}.${sig}`;
  return token;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  const expectedOrigin = request.nextUrl.origin;
  const originOk = origin === expectedOrigin;
  const refererOk = referer.startsWith(expectedOrigin);
  if (!originOk && !refererOk) {
    return NextResponse.json({ success: false, error: "Invalid origin" }, { status: 403 });
  }

  if (!checkRateLimit(request)) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body?.userId ?? "");
  const password = String(body?.password ?? "");

  if (!userId.trim() || !password.trim()) {
    return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 400 });
  }

  const okUser = userId === AUTH_USER;
  const okPass = hashPassword(password) === HASHED;

  if (!okUser || !okPass) {
    return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
  }

  const token = issueSession(userId);
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "cf_session",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(TIMEOUT_MS / 1000),
    path: "/"
  });
  return res;
}
