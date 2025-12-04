"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import RoasterGrid from "./components/RoasterGrid";
import { api } from "@/lib/api";

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

export default function RoasterPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const monthNames = useMemo(() => [
    "January","February","March","April","May","June","July","August","September","October","November","December"
  ], []);
  const [data, setData] = useState<
    | {
        month: number;
        year: number;
        dates: string[];
        artists: string[];
        matrix: Record<
          string,
          Record<
            string,
            { type: "BOOKED" | "VACATION" | "CONFLICT"; details: Record<string, unknown> }
          >
        >;
      }
    | undefined
  >(undefined);

  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn: () => api.getArtists()
  });

  const generateMutation = useMutation({
    mutationFn: (variables: { month: number; year: number }) =>
      api.generateRoaster(variables.month + 1, variables.year),
    onSuccess: (result) => {
      setData(result);
      toast.success("Roaster generated");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate roaster"
      );
    }
  });

  useEffect(() => {
    generateMutation.mutate({ month, year });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return (
    <TableLayout
      title="Smart Roaster"
      description="Visualize bookings, vacations, and conflicts per artist."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const d = new Date(year, month, 1);
              d.setMonth(d.getMonth() - 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            ◀ {monthNames[(month + 11) % 12]}
          </button>
          <button
            type="button"
            onClick={() => {
              const d = new Date(year, month, 1);
              d.setMonth(d.getMonth() + 1);
              setMonth(d.getMonth());
              setYear(d.getFullYear());
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            {monthNames[(month + 1) % 12]} ▶
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col text-xs font-semibold text-slate-600">
          Month
          <select
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {months.map((label, idx) => (
              <option key={label} value={idx}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs font-semibold text-slate-600">
          Year
          <input
            type="number"
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
        <div className="text-xs text-slate-500">
          Artists tracked: {artists?.length ?? 0}
        </div>
      </div>
      <RoasterGrid data={data} />
    </TableLayout>
  );
}


