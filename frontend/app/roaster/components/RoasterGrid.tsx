"use client";

import clsx from "clsx";
import { utils, writeFile } from "xlsx";
import { useMemo } from "react";

type RoasterMatrix = Record<
  string,
  Record<
    string,
    {
      type: "BOOKED" | "VACATION" | "CONFLICT";
      details: Record<string, unknown>;
    }
  >
>;

interface RoasterData {
  month: number;
  year: number;
  dates: string[];
  artists: string[];
  matrix: RoasterMatrix;
}

interface RoasterGridProps {
  data?: RoasterData;
}

const statusStyles: Record<string, string> = {
  BOOKED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  VACATION: "bg-amber-100 text-amber-800 border-amber-200",
  CONFLICT: "bg-red-100 text-red-800 border-red-200"
};

export default function RoasterGrid({ data }: RoasterGridProps) {
  const rows = data?.dates ?? [];
  const columns = data?.artists ?? [];

  const exportToExcel = () => {
    if (!data) return;
    const sheetData = [
      ["Date", ...columns],
      ...rows.map((date) => [
        date,
        ...columns.map((artist) => data.matrix[date]?.[artist]?.type ?? "")
      ])
    ];
    const worksheet = utils.aoa_to_sheet(sheetData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Roaster");
    writeFile(
      workbook,
      `roaster-${data.year}-${String(data.month).padStart(2, "0")}.xlsx`
    );
  };

  const hasData = rows.length > 0 && columns.length > 0;

  const legend = useMemo(
    () => [
      { label: "Booked", color: statusStyles.BOOKED },
      { label: "Vacation", color: statusStyles.VACATION },
      { label: "Conflict", color: statusStyles.CONFLICT }
    ],
    []
  );

  if (!hasData) {
    return (
      <p className="text-sm text-slate-500">
        No roaster data yet. Generate a month to see availability.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {legend.map((item) => (
            <span
              key={item.label}
              className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium",
                item.color
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={exportToExcel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-600">
                Date
              </th>
              {columns.map((artist) => (
                <th
                  key={artist}
                  className="px-3 py-2 text-left font-semibold text-slate-600"
                >
                  {artist}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((date) => (
              <tr key={date} className="border-t border-slate-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">
                  {date}
                </td>
                {columns.map((artist) => {
                  const cell = data?.matrix[date]?.[artist];
                  return (
                    <td
                      key={`${date}-${artist}`}
                      className="px-3 py-2 align-top"
                    >
                      {cell ? (
                        <div
                          className={clsx(
                            "rounded-lg border px-2 py-1 text-center font-semibold",
                            statusStyles[cell.type]
                          )}
                        >
                          {cell.type}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


