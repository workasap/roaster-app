"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import type { Summary } from "@/workerTypes";
import { api } from "@/lib/api";

export default function SummaryPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const months = useMemo(() => [
    "January","February","March","April","May","June","July","August","September","October","November","December"
  ], []);

  const summaryMutation = useMutation({
    mutationFn: (variables: { month: number; year: number }) =>
      api.getSummary(variables.month, variables.year),
    onSuccess: (result) => {
      setSummary(result);
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      api.getSummary(prevMonth, prevYear).then(setPrevSummary).catch(() => setPrevSummary(null));
      toast.success("Summary generated");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate summary"
      );
    }
  });

  useEffect(() => {
    summaryMutation.mutate({ month, year });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return (
    <TableLayout
      title="Monthly Summary"
      description="Aggregate shoots, payments, and expenses for a given month."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => {
              const prevM = month === 1 ? 12 : month - 1;
              const prevY = month === 1 ? year - 1 : year;
              setMonth(prevM);
              setYear(prevY);
            }}
          >
            ◀ {months[(month + 10) % 12]}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!summary) return;
              const rows = [
                ["Metric", "Value"],
                ["Total Shoots", String(summary.total_shoots)],
                ["Payments", String(summary.total_payments)],
                ["Expenses", String(summary.total_expenses)],
                ["Net Balance", String(summary.net_balance)]
              ];
              const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `summary_${month}_${year}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!summary}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
          >
            Export CSV
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            onClick={() => {
              const nextM = month === 12 ? 1 : month + 1;
              const nextY = month === 12 ? year + 1 : year;
              setMonth(nextM);
              setYear(nextY);
            }}
          >
            {months[month % 12]} ▶
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">
          Month
          <select
            value={month - 1}
            onChange={(e) => setMonth(Number(e.target.value) + 1)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {months.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Year
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Shoots"
            value={summary.total_shoots.toString()}
          />
          <SummaryCard
            label="Payments"
            value={`₹${summary.total_payments.toLocaleString()}`}
          />
          <SummaryCard
            label="Expenses"
            value={`₹${summary.total_expenses.toLocaleString()}`}
          />
          <SummaryCard
            label="Net Balance"
            value={`₹${summary.net_balance.toLocaleString()}`}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Generate a summary to view monthly KPIs.
        </p>
      )}

      {summary && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Revenue vs Expenses</div>
            <div className="p-3">
              <BarCompare
                left={{ label: "Revenue", value: summary.total_payments, color: "bg-emerald-600" }}
                right={{ label: "Expenses", value: summary.total_expenses, color: "bg-rose-600" }}
              />
            </div>
          </div>
          {prevSummary && (
            <div className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">Vs Previous Month</div>
              <div className="p-3 grid gap-3 text-sm md:grid-cols-3">
                {(["total_payments","total_expenses","net_balance"] as const).map((key) => {
                  const cur = summary[key];
                  const prev = prevSummary[key];
                  const growth = prev ? ((cur - prev) / Math.abs(prev)) * 100 : (cur ? 100 : 0);
                  const label = key === "total_payments" ? "Revenue" : key === "total_expenses" ? "Expenses" : "Net";
                  return (
                    <div key={key} className="rounded-xl border border-slate-200 p-3">
                      <div className="text-slate-600 font-semibold">{label}</div>
                      <div className="mt-1">Current: <span className="font-semibold">₹{cur.toLocaleString()}</span></div>
                      <div>Previous: <span className="font-semibold">₹{prev.toLocaleString()}</span></div>
                      <div className={growth >= 0 ? "text-emerald-700" : "text-rose-700"}>Growth: <span className="font-semibold">{growth.toFixed(1)}%</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </TableLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function BarCompare({ left, right }: { left: { label: string; value: number; color: string }; right: { label: string; value: number; color: string } }) {
  const max = Math.max(left.value, right.value, 1);
  const lw = Math.round((left.value / max) * 100);
  const rw = Math.round((right.value / max) * 100);
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-600">{left.label}</div>
      <div className="h-4 w-full rounded bg-slate-100">
        <div className={`h-4 rounded ${left.color}`} style={{ width: `${lw}%` }} />
      </div>
      <div className="text-xs font-semibold text-slate-600">{right.label}</div>
      <div className="h-4 w-full rounded bg-slate-100">
        <div className={`h-4 rounded ${right.color}`} style={{ width: `${rw}%` }} />
      </div>
    </div>
  );
}
