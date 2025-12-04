"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

export interface ColumnConfig<T extends object> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
}

interface CrudTableProps<T extends object> {
  data: T[];
  columns: ColumnConfig<T>[];
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  hideEmptyColumns?: boolean;
  emptyPlaceholder?: ReactNode;
}

export default function CrudTable<T extends object>({
  data,
  columns,
  isLoading,
  onEdit,
  onDelete,
  hideEmptyColumns,
  emptyPlaceholder
}: CrudTableProps<T>) {
  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    );
  }

  if (!data.length) {
    return <p className="text-sm text-slate-500">No records found.</p>;
  }

  const isNonEmpty = (v: unknown) => v != null && String(v).trim().length > 0;
  const visibleColumns = hideEmptyColumns
    ? columns.filter((col) =>
        data.some((row) => isNonEmpty((row as Record<string, unknown>)[String(col.key)]))
      )
    : columns;

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={String(column.key)}
                className="px-3 py-2 text-left font-semibold text-slate-600"
              >
                {column.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-3 py-2 text-right font-semibold text-slate-600">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr key={idx}>
              {visibleColumns.map((column) => {
                const key = column.key as keyof T;
                const value = row[key];
                return (
                  <td key={String(column.key)} className="px-3 py-2">
                    {column.render
                      ? column.render(row)
                      : isNonEmpty(value)
                        ? (value as ReactNode)
                        : emptyPlaceholder ?? ""}
                  </td>
                );
              })}
              {(onEdit || onDelete) && (
                <td className="px-3 py-2 text-right text-xs font-semibold">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="rounded-md px-2 py-1 text-brand-700 hover:bg-brand-50"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className={clsx(
                        "rounded-md px-2 py-1",
                        onEdit ? "ml-1" : "",
                        "text-red-600 hover:bg-red-50"
                      )}
                    >
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


