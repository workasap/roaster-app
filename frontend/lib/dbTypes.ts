export type TableId =
  | "shoots"
  | "payments_received"
  | "vacation"
  | "master_data"
  | "roaster";

export interface BaseRow {
  id?: number;
}

export interface ShootsRow extends BaseRow {
  shoot_date?: string | null;
  project_name?: string | null;
  location?: string | null;
  director?: string | null;
  notes?: string | null;
}

export interface PaymentsReceivedRow extends BaseRow {
  payment_date?: string | null;
  client_name?: string | null;
  amount?: number | null;
  currency?: string | null;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
}

export interface VacationRow extends BaseRow {
  employee_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  days?: number | null;
  type?: string | null;
  notes?: string | null;
}

export interface MasterDataRow extends BaseRow {
  category?: string | null;
  key?: string | null;
  value?: string | null;
  description?: string | null;
}

export interface RoasterRow extends BaseRow {
  date?: string | null;
  employee_name?: string | null;
  role?: string | null;
  shift?: string | null;
  location?: string | null;
  notes?: string | null;
}

export type AnyRow =
  | ShootsRow
  | PaymentsReceivedRow
  | VacationRow
  | MasterDataRow
  | RoasterRow;

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableConfig {
  id: TableId;
  label: string;
  columns: TableColumn[];
}

export const TABLE_CONFIGS: TableConfig[] = [
  {
    id: "shoots",
    label: "SHOOTS",
    columns: [
      { key: "shoot_date", label: "Shoot Date" },
      { key: "project_name", label: "Project" },
      { key: "location", label: "Location" },
      { key: "director", label: "Director" },
      { key: "notes", label: "Notes" }
    ]
  },
  {
    id: "payments_received",
    label: "PAYMENTS RECEIVED",
    columns: [
      { key: "payment_date", label: "Payment Date" },
      { key: "client_name", label: "Client" },
      { key: "amount", label: "Amount" },
      { key: "currency", label: "Currency" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
      { key: "notes", label: "Notes" }
    ]
  },
  {
    id: "vacation",
    label: "VACATION",
    columns: [
      { key: "employee_name", label: "Employee" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "days", label: "Days" },
      { key: "type", label: "Type" },
      { key: "notes", label: "Notes" }
    ]
  },
  {
    id: "master_data",
    label: "MASTER DATA",
    columns: [
      { key: "category", label: "Category" },
      { key: "key", label: "Key" },
      { key: "value", label: "Value" },
      { key: "description", label: "Description" }
    ]
  },
  {
    id: "roaster",
    label: "ROASTER",
    columns: [
      { key: "date", label: "Date" },
      { key: "employee_name", label: "Employee" },
      { key: "role", label: "Role" },
      { key: "shift", label: "Shift" },
      { key: "location", label: "Location" },
      { key: "notes", label: "Notes" }
    ]
  }
];

export function getTableConfig(id: TableId): TableConfig {
  const config = TABLE_CONFIGS.find((table) => table.id === id);
  if (!config) {
    throw new Error(`Unknown table: ${id}`);
  }
  return config;
}


