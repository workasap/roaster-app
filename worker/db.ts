import type { D1Database, D1Result } from "@cloudflare/workers-types";

export interface Env {
  DB?: D1Database;
  roaster_app?: D1Database;
  ROASTER_APP?: D1Database;
  ALLOWED_ORIGINS?: string;
}

function getDb(env: Env): D1Database {
  const db = env.DB ?? env.roaster_app ?? env.ROASTER_APP;
  if (!db) {
    throw new Error("D1 binding not configured. Expected DB, roaster_app or ROASTER_APP.");
  }
  return db;
}

export async function queryAll<T>(
  env: Env,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const stmt = getDb(env).prepare(sql).bind(...params);
  const { results } = (await stmt.all()) as D1Result<T>;
  return results ?? [];
}

export async function queryOne<T>(
  env: Env,
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const items = await queryAll<T>(env, sql, params);
  return items[0] ?? null;
}

export async function execute(
  env: Env,
  sql: string,
  params: unknown[] = []
) {
  const stmt = getDb(env).prepare(sql).bind(...params);
  const { meta } = await stmt.run();
  return meta;
}

export async function transaction(
  env: Env,
  statements: { sql: string; params?: unknown[] }[]
) {
  const db = getDb(env);
  const prepared = statements.map(({ sql, params = [] }) =>
    db.prepare(sql).bind(...params)
  );
  await db.batch(prepared);
}


