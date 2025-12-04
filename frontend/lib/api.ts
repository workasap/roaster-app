import type { SheetRow, WorkbookResponse } from "./types";
import type { TableId } from "./dbTypes";
import type {
  Shoot,
  Expense,
  Payment,
  Vacation,
  MasterData,
  RoasterEntry,
  Summary,
  Paginated,
  YearlySummary
} from "@/workerTypes";

const DEFAULT_API_BASE = "http://127.0.0.1:8787";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || DEFAULT_API_BASE;

const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json"
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text();
    throw new ApiError(response.status, message || response.statusText);
  }
  const json = await response.json();
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export async function fetchTableData(table: TableId): Promise<SheetRow[]> {
  const url = `${API_BASE_URL}/api/data/${encodeURIComponent(table)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });
  const payload = await handleResponse<WorkbookResponse>(response);
  return payload.rows;
}

export async function saveTableData(
  table: TableId,
  rows: SheetRow[]
): Promise<void> {
  const url = `${API_BASE_URL}/api/data/${encodeURIComponent(table)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ rows })
  });
  await handleResponse<{ success: boolean }>(response);
}

export function inferColumns(rows: SheetRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (key && key.trim().length > 0) {
        set.add(key);
      }
    });
  });
  return Array.from(set);
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Accept: "application/json"
    }
  });
  return handleResponse<T>(response);
}

async function sendJson<T>(
  path: string,
  method: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : undefined
  });
  return handleResponse<T>(response);
}

function toQuery(params?: Record<string, string | number | undefined | null>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  async listShoots(
    params?: Record<string, string | number | undefined>
  ): Promise<Paginated<Shoot>> {
    return getJson<Paginated<Shoot>>(`/api/shoots${toQuery(params)}`);
  },
  async createShoot(payload: Shoot): Promise<void> {
    await sendJson("/api/shoots", "POST", payload);
  },
  async updateShoot(id: number, payload: Shoot): Promise<void> {
    await sendJson(`/api/shoots/${id}`, "PATCH", payload);
  },
  async deleteShoot(id: number): Promise<void> {
    await sendJson(`/api/shoots/${id}`, "DELETE");
  },
  async listExpenses(
    params?: Record<string, string | number | undefined>
  ): Promise<Paginated<Expense>> {
    return getJson<Paginated<Expense>>(`/api/expenses${toQuery(params)}`);
  },
  async createExpense(payload: Expense): Promise<void> {
    await sendJson("/api/expenses", "POST", payload);
  },
  async updateExpense(id: number, payload: Expense): Promise<void> {
    await sendJson(`/api/expenses/${id}`, "PATCH", payload);
  },
  async deleteExpense(id: number): Promise<void> {
    await sendJson(`/api/expenses/${id}`, "DELETE");
  },
  async listPayments(
    params?: Record<string, string | number | undefined>
  ): Promise<Paginated<Payment>> {
    return getJson<Paginated<Payment>>(`/api/payments${toQuery(params)}`);
  },
  async createPayment(payload: Payment): Promise<void> {
    await sendJson("/api/payments", "POST", payload);
  },
  async updatePayment(id: number, payload: Payment): Promise<void> {
    await sendJson(`/api/payments/${id}`, "PATCH", payload);
  },
  async deletePayment(id: number): Promise<void> {
    await sendJson(`/api/payments/${id}`, "DELETE");
  },
  async listVacations(
    params?: Record<string, string | number | undefined>
  ): Promise<Paginated<Vacation>> {
    return getJson<Paginated<Vacation>>(`/api/vacations${toQuery(params)}`);
  },
  async createVacation(payload: Vacation): Promise<void> {
    await sendJson("/api/vacations", "POST", payload);
  },
  async updateVacation(id: number, payload: Vacation): Promise<void> {
    await sendJson(`/api/vacations/${id}`, "PATCH", payload);
  },
  async deleteVacation(id: number): Promise<void> {
    await sendJson(`/api/vacations/${id}`, "DELETE");
  },
  async listMasterData(
    params?: Record<string, string | number | undefined>
  ): Promise<Paginated<MasterData>> {
    return getJson<Paginated<MasterData>>(`/api/master-data${toQuery(params)}`);
  },
  async createMasterData(payload: MasterData): Promise<void> {
    await sendJson("/api/master-data", "POST", payload);
  },
  async updateMasterData(id: number, payload: MasterData): Promise<void> {
    await sendJson(`/api/master-data/${id}`, "PATCH", payload);
  },
  async deleteMasterData(id: number): Promise<void> {
    await sendJson(`/api/master-data/${id}`, "DELETE");
  },
  async generateRoaster(month: number, year: number) {
    return sendJson<{
      month: number;
      year: number;
      artists: string[];
      dates: string[];
      matrix: Record<string, Record<string, { type: "BOOKED" | "VACATION" | "CONFLICT"; details: Record<string, unknown> }>>;
    }>(`/api/roaster-generate${toQuery({ month, year })}`, "POST");
  },
  async listRoasterEntries(params?: {
    from?: string;
    to?: string;
    artist?: string;
  }): Promise<RoasterEntry[]> {
    return getJson<RoasterEntry[]>(
      `/api/roaster-entries${toQuery(params)}`
    );
  },
  async getArtists(): Promise<string[]> {
    return getJson<string[]>("/api/artists");
  },
  async getSummary(month: number, year: number): Promise<Summary> {
    return getJson<Summary>(`/api/summary${toQuery({ month, year })}`);
  },
  async yearlySummary(year: number): Promise<YearlySummary> {
    return getJson<YearlySummary>(`/api/yearly-summary${toQuery({ year })}`);
  },
  async availability(from: string, to: string, artistsCsv: string): Promise<Record<string, { booked: string[]; vacation: string[]; conflicts: string[] }>> {
    const query = toQuery({ from, to, artists: artistsCsv });
    return getJson(`/api/availability${query}`);
  },
  async calculateCoordinatorAmount(payload: {
    date?: string | null;
    number_of_artists: number;
    work_type?: string | null;
    per_day_rate?: number | null;
    work_days?: number | null;
    artists?: string | null;
  }): Promise<{
    date: string | null;
    work_type: string | null;
    number_of_artists: number;
    per_day_rate: number;
    work_days: number;
    total: number;
    per_day: number;
    breakdown: { artist: string; amount: number }[];
  }> {
    return sendJson(
      "/api/calculate-coordinator-amount",
      "POST",
      payload
    );
  }
};

export type { ApiError };

