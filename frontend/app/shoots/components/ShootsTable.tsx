"use client";

import type { Shoot } from "@/workerTypes";
import { format } from "date-fns";
import { useMemo, useState } from "react";

interface ShootsTableProps {
  shoots: Shoot[];
  onEdit: (shoot: Shoot) => void;
  isLoading?: boolean;
}

export default function ShootsTable({
  shoots,
  onEdit,
  isLoading
}: ShootsTableProps) {
  const [sortKey, setSortKey] = useState<keyof Shoot | "">("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Hooks must be declared before any conditional returns

  const sorted = useMemo(() => {
    if (!sortKey) return shoots;
    return [...shoots].sort((a, b) => {
      const av = a[sortKey] as unknown;
      const bv = b[sortKey] as unknown;
      const dir = sortDir === "asc" ? 1 : -1;
      const an = Number(av);
      const bn = Number(bv);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
      const as = String(av ?? "").toUpperCase();
      const bs = String(bv ?? "").toUpperCase();
      return as.localeCompare(bs) * dir;
    });
  }, [shoots, sortKey, sortDir]);

  const handleSort = (key: keyof Shoot) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    );
  }

  if (!shoots.length) {
    return (
      <p className="text-sm text-slate-500">
        No shoots yet. Use “New Shoot” to create one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <th onClick={() => handleSort("inv_date")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Date
              {sortKey === "inv_date" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("invoice_no")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Invoice
              {sortKey === "invoice_no" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("coordinator")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Coordinator
              {sortKey === "coordinator" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("location")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Location
              {sortKey === "location" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("work_type")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Work Type
              {sortKey === "work_type" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("artist_provided")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Artists
              {sortKey === "artist_provided" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("amount")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Amount
              {sortKey === "amount" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th onClick={() => handleSort("status")} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-slate-600">
              Status
              {sortKey === "status" && (
                <span className="ml-1 text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
              )}
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((shoot) => (
            <tr key={shoot.id}>
              <td className="px-3 py-2">
                {shoot.inv_date
                  ? format(new Date(shoot.inv_date), "dd MMM yyyy")
                  : "-"}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {shoot.invoice_no}
              </td>
              <td className="px-3 py-2">{shoot.coordinator || "-"}</td>
              <td className="px-3 py-2">{shoot.location || "-"}</td>
            <td className="px-3 py-2">{shoot.work_type || "-"}</td>
            <td className="px-3 py-2">{shoot.artist_provided || "-"}</td>
            <td className="px-3 py-2">
              {shoot.amount != null ? `₹${shoot.amount.toLocaleString()}` : "-"}
            </td>
            <td className="px-3 py-2">
              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {shoot.status || "NA"}
              </span>
            </td>
              <td className="px-3 py-2 text-right text-xs">
                <button
                  type="button"
                  onClick={() => onEdit(shoot)}
                  className="rounded-md px-2 py-1 font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


