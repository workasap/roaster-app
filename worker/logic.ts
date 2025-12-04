import type { Shoot, Vacation } from "./types";

export function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

export function parseIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const str = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
  return str;
}

export function parseRangeToIso(range: string): { start: string; end: string } | null {
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

export function normalizeArtistName(name: string): string {
  return name.trim().toUpperCase();
}

export function parseArtistList(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(/[;,]/)
    .map((token) => normalizeArtistName(token))
    .filter(Boolean);
}

export function computeShootDerivedFields(input: Partial<Shoot>): Partial<Shoot> {
  const result: Partial<Shoot> = { ...input };

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

  if (perDay !== undefined && days !== undefined && artists !== undefined) {
    result.amount = perDay * days * artists;
  } else if (amount !== undefined) {
    result.amount = amount;
  }

  if (result.amount !== undefined) {
    const rec = received ?? 0;
    result.received = rec;
    result.balance = result.amount - rec;
    if (result.amount > 0) {
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

  if (result.coordinator) {
    result.coordinator = result.coordinator.trim().toUpperCase();
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

export function expandDateRange(from: string, to: string): string[] {
  const result: string[] = [];
  const startDate = new Date(from);
  const endDate = new Date(to);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    result.push(iso);
  }
  return result;
}

export interface RoasterCell {
  type: "BOOKED" | "VACATION" | "CONFLICT";
  details: unknown;
}

export type RoasterMatrix = Record<string, Record<string, RoasterCell>>;

export interface RoasterBuildResult {
  artists: string[];
  dates: string[];
  matrix: RoasterMatrix;
  entries: Array<{
    date: string;
    artist: string;
    source_invoice: string;
    coordinator?: string | null;
    location?: string | null;
    work_type?: string | null;
    description?: string | null;
  }>;
}

export function buildRoasterMatrix(
  shoots: Shoot[],
  vacations: Vacation[],
  month: number,
  year: number
): RoasterBuildResult {
  const monthStr = month.toString().padStart(2, "0");
  const matrix: RoasterMatrix = {};
  const entries: RoasterBuildResult["entries"] = [];
  const dateSet = new Set<string>();
  const artistSet = new Set<string>();

  const addDate = (date: string) => {
    if (!date.startsWith(`${year}-${monthStr}-`)) return false;
    if (!dateSet.has(date)) {
      dateSet.add(date);
    }
    return true;
  };

  const addCell = (
    date: string,
    artist: string,
    type: RoasterCell["type"],
    details: unknown
  ) => {
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
  };

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


export function calculateCoordinatorAmount(params: {
  date?: string | null;
  number_of_artists: number;
  work_type?: string | null;
  per_day_rate?: number | null;
  work_days?: number | null;
  artists?: string | null;
}) {
  const n = parseNumber(params.number_of_artists) ?? 0;
  const rate = parseNumber(params.per_day_rate) ?? 0;
  const days = parseNumber(params.work_days) ?? 1;
  const total = n * rate * days;
  const perDay = rate * n;
  const list = parseArtistList(params.artists);
  const perArtistAmount = n > 0 ? total / n : 0;
  const breakdown = (list.length ? list : Array.from({ length: n }, (_, i) => `ARTIST_${i + 1}`)).map((name) => ({
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



