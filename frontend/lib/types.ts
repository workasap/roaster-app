export type CellPrimitive = string | number | boolean | null;

export type SheetRow = Record<string, CellPrimitive>;

export interface WorkbookResponse {
  sheet: string;
  rows: SheetRow[];
  updatedAt: string;
}

