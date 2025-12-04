"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TableLayout from "@/components/TableLayout";
import { api } from "@/lib/api";
import clsx from "clsx";

type AvailabilityBucket = { booked: string[]; vacation: string[]; conflicts: string[] };

export default function AvailabilityPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [artistsCsv, setArtistsCsv] = useState<string>("");
  const [params, setParams] = useState<{ from: string; to: string; artists: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["availability", params],
    queryFn: () => api.availability(params!.from, params!.to, params!.artists),
    enabled: !!params
  });

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const days: string[] = useMemo(() => {
    if (!params) return [];
    const start = new Date(params.from);
    const end = new Date(params.to);
    const result: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(toIso(d));
    }
    return result;
  }, [params]);

  const artists: string[] = useMemo(() => {
    if (!data) return [];
    return Object.keys(data).sort();
  }, [data]);

  const statusColor: Record<string, string> = {
    BOOKED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    VACATION: "bg-amber-100 text-amber-800 border-amber-200",
    CONFLICT: "bg-red-100 text-red-800 border-red-200"
  };

  const getCellType = (name: string, date: string): keyof AvailabilityBucket | "" => {
    const bucket = (data ?? {})[name] as AvailabilityBucket | undefined;
    if (!bucket) return "";
    if (bucket.conflicts.includes(date)) return "conflicts";
    if (bucket.booked.includes(date)) return "booked";
    if (bucket.vacation.includes(date)) return "vacation";
    return "";
  };

  useEffect(() => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    setParams({ from: toIso(start), to: toIso(end), artists: artistsCsv });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, artistsCsv]);

  const monthNames = [
    "January","February","March","April","May","June","July","August","September","October","November","December"
  ];

  return (
    <TableLayout
      title="Availability"
      description="Check artist availability for the selected month."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => {
              const d = new Date(year, month, 1);
              d.setMonth(d.getMonth() - 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
          >
            ◀ {monthNames[(month + 11) % 12]}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => {
              const d = new Date(year, month, 1);
              d.setMonth(d.getMonth() + 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
          >
            {monthNames[(month + 1) % 12]} ▶
          </button>
          {data && (
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              onClick={() => {
                const rows: string[][] = [["Artist", ...days]];
                for (const name of artists) {
                  rows.push([
                    name,
                    ...days.map((d) => {
                      const t = getCellType(name, d);
                      return t ? t.toUpperCase() : "";
                    })
                  ]);
                }
                const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
                const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "availability.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </button>
          )}
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-600">
          Artists (comma-separated)
          <input
            type="text"
            value={artistsCsv}
            onChange={(e) => setArtistsCsv(e.target.value)}
            placeholder="e.g. ANYA, AIMEE"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {data ? (
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
                  Artist
                </th>
                {days.map((d) => (
                  <th key={d} className="px-3 py-2 text-left font-semibold text-slate-600">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artists.map((name) => (
                <tr key={name} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">
                    {name}
                  </td>
                  {days.map((d) => {
                    const type = getCellType(name, d);
                    const label = type.toUpperCase();
                    const color = type
                      ? statusColor[label]
                      : "";
                    return (
                      <td key={`${name}-${d}`} className="px-3 py-2 align-top">
                        {type ? (
                          <div
                            className={clsx(
                              "rounded-lg border px-2 py-1 text-center font-semibold",
                              color
                            )}
                          >
                            {label}
                          </div>
                        ) : (
                          <span className="text-slate-300">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      )}
    </TableLayout>
  );
}
