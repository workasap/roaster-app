"use client";

import { useEffect, useMemo, useState } from "react";
import TableLayout from "@/components/TableLayout";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Yearly = {
  year: number;
  totals: { revenue: number; expenses: number; profit: number; shoots: number };
  monthly: { revenue: { m: string; total: number }[]; expenses: { m: string; total: number }[]; shoots: { m: string; total: number }[] };
  top_clients: { name: string | null; total: number }[];
  top_expenses: { name: string | null; total: number }[];
  compare_prev_year: {
    revenue: { current: number; previous: number; growth_pct: number };
    expenses: { current: number; previous: number; growth_pct: number };
    profit: { current: number; previous: number; growth_pct: number };
  };
};

export default function YearlyPage() {
  const d = new Date();
  const [year, setYear] = useState(d.getFullYear());
  const { data, refetch } = useQuery<Yearly>({
    queryKey: ["yearly", year],
    queryFn: () => api.yearlySummary(year)
  });

  useEffect(() => { refetch(); }, [year, refetch]);

  const maxRev = Math.max(...(data?.monthly.revenue.map((r) => r.total) ?? [1]));
  const maxExp = Math.max(...(data?.monthly.expenses.map((r) => r.total) ?? [1]));
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const revMap = useMemo(() => Object.fromEntries((data?.monthly.revenue ?? []).map((r) => [r.m, r.total])), [data]);
  const expMap = useMemo(() => Object.fromEntries((data?.monthly.expenses ?? []).map((r) => [r.m, r.total])), [data]);

  return (
    <TableLayout
      title="Yearly Summary"
      description="Business insights across the selected year with breakdowns and comparisons."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => setYear((y) => y - 1)}
          >
            ◀ {year - 1}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => setYear((y) => y + 1)}
          >
            {year + 1} ▶
          </button>
        </div>
      }
    >
      {!data ? (
        <div className="h-64 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            <KPI title="Revenue" value={data.totals.revenue} accent="emerald" />
            <KPI title="Expenses" value={data.totals.expenses} accent="rose" />
            <KPI title="Profit" value={data.totals.profit} accent="indigo" />
            <KPI title="Jobs" value={data.totals.shoots} accent="amber" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Monthly Revenue">
              <Bars months={months} values={months.map((m) => revMap[m] || 0)} max={maxRev} color="bg-emerald-600" />
            </Card>
            <Card title="Monthly Expenses">
              <Bars months={months} values={months.map((m) => expMap[m] || 0)} max={maxExp} color="bg-rose-600" />
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Top Clients">
              <ul className="space-y-2 text-sm">
                {data.top_clients.map((c) => (
                  <li key={c.name ?? "-"} className="flex items-center justify-between">
                    <span className="text-slate-700">{c.name ?? "-"}</span>
                    <span className="font-semibold">₹{(c.total || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Top Expense Categories">
              <ul className="space-y-2 text-sm">
                {data.top_expenses.map((c) => (
                  <li key={c.name ?? "-"} className="flex items-center justify-between">
                    <span className="text-slate-700">{c.name ?? "-"}</span>
                    <span className="font-semibold">₹{(c.total || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Year-over-Year Comparison">
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              {(["revenue","expenses","profit"] as const).map((k) => {
                const entry = k === "revenue"
                  ? data.compare_prev_year.revenue
                  : k === "expenses"
                    ? data.compare_prev_year.expenses
                    : data.compare_prev_year.profit;
                const grow = Number(entry.growth_pct || 0);
                return (
                  <div key={k} className="rounded-xl border border-slate-200 p-3">
                    <div className="text-slate-600 font-semibold capitalize">{k}</div>
                    <div className="mt-1">Current: <span className="font-semibold">₹{entry.current.toLocaleString()}</span></div>
                    <div>Previous: <span className="font-semibold">₹{entry.previous.toLocaleString()}</span></div>
                    <div className={grow >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      Growth: <span className="font-semibold">{grow.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </TableLayout>
  );
}

function KPI({ title, value, accent }: { title: string; value: number; accent: "emerald" | "rose" | "indigo" | "amber" }) {
  const color = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100"
  }[accent];
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xl font-bold">₹{(value || 0).toLocaleString()}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Bars({ months, values, max, color }: { months: string[]; values: number[]; max: number; color: string }) {
  return (
    <div className="grid grid-cols-12 items-end gap-1">
      {months.map((m, i) => {
        const v = values[i] || 0;
        const h = max ? Math.round((v / max) * 120) : 0;
        return (
          <div key={m} className="flex flex-col items-center gap-1">
            <div className={`w-4 rounded ${color}`} style={{ height: `${h}px` }} />
            <div className="text-[10px] text-slate-500">{m}</div>
          </div>
        );
      })}
    </div>
  );
}
