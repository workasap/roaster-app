import type { SheetRow } from "./types";

export function uniqueColumns(a: string[], b: string[] = []): string[] {
  return Array.from(new Set([...a, ...b].filter(Boolean)));
}

export function normalizeRow(row: SheetRow, columns: string[]): SheetRow {
  const normalized: SheetRow = {};
  columns.forEach((column) => {
    normalized[column] =
      row[column] === undefined || row[column] === null ? "" : row[column];
  });
  return normalized;
}

export function cloneRows(rows: SheetRow[]): SheetRow[] {
  return rows.map((row) => ({ ...row }));
}

export function computeRowHash(rows: SheetRow[]): string {
  return JSON.stringify(rows);
}

export function hasData(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return true;
}

