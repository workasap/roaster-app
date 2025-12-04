export type TableId =
  | "shoots"
  | "payments_received"
  | "vacation"
  | "master_data"
  | "roaster";

export interface TableMeta {
  id: TableId;
  label: string;
}

export const TABLES: TableMeta[] = [
  { id: "shoots", label: "SHOOTS" },
  { id: "payments_received", label: "PAYMENTS RECEIVED" },
  { id: "vacation", label: "VACATION" },
  { id: "master_data", label: "MASTER DATA" },
  { id: "roaster", label: "ROASTER" }
];

export const DEFAULT_TABLE_ID: TableId = "shoots";

