"use client";

import clsx from "clsx";
import type { SheetRow } from "@/lib/types";

interface EditableTableProps {
  rows: SheetRow[];
  columns: string[];
  onCellChange: (rowIndex: number, column: string, value: string) => void;
  onDeleteRow: (rowIndex: number) => void;
  validationErrors: Record<string, string>;
}

export default function EditableTable({
  rows,
  columns,
  onCellChange,
  onDeleteRow,
  validationErrors
}: EditableTableProps) {
  if (columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500">
        The selected sheet has no columns yet. Add a column to begin.
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500">
        No rows found. Use “Add Row” to start capturing records.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              #
            </th>
            {columns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column}
              </th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIdx) => {
            const rowError = validationErrors[`${rowIdx}:row`];
            return (
              <tr
                key={`row-${rowIdx}`}
                className={clsx(rowError && "bg-red-50/40")}
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-2 text-xs font-semibold text-slate-400">
                  {rowIdx + 1}
                </td>
                {columns.map((column) => {
                  const cellKey = `${rowIdx}:${column}`;
                  return (
                    <td key={cellKey} className="px-4 py-2">
                      <input
                        className={clsx(
                          "w-full rounded-md border px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
                          validationErrors[cellKey]
                            ? "border-red-400 bg-red-50"
                            : "border-slate-200 bg-white"
                        )}
                        value={
                          typeof row[column] === "boolean"
                            ? row[column]
                              ? "true"
                              : "false"
                            : row[column] ?? ""
                        }
                        onChange={(event) =>
                          onCellChange(rowIdx, column, event.target.value)
                        }
                      />
                      {validationErrors[cellKey] && (
                        <p className="mt-1 text-xs text-red-600">
                          {validationErrors[cellKey]}
                        </p>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                    onClick={() => onDeleteRow(rowIdx)}
                  >
                    Delete
                  </button>
                  {rowError && (
                    <p className="mt-1 text-xs text-red-600">{rowError}</p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

