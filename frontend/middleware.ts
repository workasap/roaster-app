import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TIMEOUT_MS = 10 * 60 * 1000;
const SECRET = process.env.AUTH_SECRET || "dev-secret";

async function hmac(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function verify(token: string): Promise<{ uid: string; last: number } | null> {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const json = Buffer.from(b64, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { uid: string; last: number };
    if (!parsed?.uid || typeof parsed.last !== "number") return null;
    const expected = await hmac(json);
    if (sig !== expected) return null;
    const now = Date.now();
    if (parsed.last + TIMEOUT_MS < now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicPaths = ["/login", "/_next", "/favicon.ico", "/api/login", "/api/logout"]; 
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cf_session")?.value || "";
  const session = await verify(token);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const refreshed = { ...session, last: Date.now() };
  const raw = JSON.stringify(refreshed);
  const json = Buffer.from(raw).toString("base64url");
  const sig = await hmac(raw);
  res.cookies.set({
    name: "cf_session",
    value: `${json}.${sig}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.floor(TIMEOUT_MS / 1000),
    path: "/"
  });
  return res;
}

export const config = {
  matcher: ["/(.*)"]
};
