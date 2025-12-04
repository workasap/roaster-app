"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import SortableCrudTable from "@/components/SortableCrudTable";
import AutoCompleteInput from "@/components/AutoCompleteInput";
import CrudForm, { type FieldConfig } from "@/components/CrudForm";
import type { Expense } from "@/workerTypes";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

function useExpenseFields() {
  const { data: masterData } = useQuery({
    queryKey: ["master-data", { pageSize: 200 }],
    queryFn: () => api.listMasterData({ pageSize: 200 })
  });
  const { data: artistsList } = useQuery({ queryKey: ["artists"], queryFn: () => api.getArtists() });
  const { data: shootsData } = useQuery({ queryKey: ["shoots-options", { pageSize: 200 }], queryFn: () => api.listShoots({ pageSize: 200 }) });
  const categories = Array.from(new Set((masterData?.items ?? []).map((r) => r.expense_category).filter(Boolean))) as string[];
  const modes = Array.from(new Set((masterData?.items ?? []).map((r) => r.payment_mode).filter(Boolean))) as string[];
  const invoiceNos = Array.from(new Set((shootsData?.items ?? []).map((r) => r.invoice_no).filter(Boolean))) as string[];
  const expenseFields: FieldConfig[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "description", label: "Remark/Description", type: "text", required: true },
    { name: "paid_for_artist", label: "Artist", type: "text", placeholder: "Select or type; use comma for multiple", datalistId: "artistsListExp", datalistOptions: (artistsList ?? []) },
    { name: "category", label: "Category", type: "text", placeholder: "Select or type new", datalistId: "expenseCategories", datalistOptions: categories },
    { name: "mode", label: "Mode", type: "text", placeholder: "Select or type new", datalistId: "paymentModes", datalistOptions: modes },
    { name: "invoice_no", label: "Invoice #", type: "text", placeholder: "Select or type", datalistId: "invoiceNos", datalistOptions: invoiceNos },
    { name: "amount_out", label: "Expense Amount", type: "number", transform: (value) => (value ? Number(value) : null) },
    { name: "amount_in", label: "Reimbursed Amount", type: "number", transform: (value) => (value ? Number(value) : null) },
    { name: "remark", label: "Remark", type: "text", placeholder: "Optional note", },
    { name: "total_expense", label: "Final Expense Done", type: "number", readOnly: true, computeValue: (values) => {
        const out = Number(values["amount_out"] || 0);
        const inc = Number(values["amount_in"] || 0);
        return String(out - inc);
      } }
  ];
  return expenseFields;
}

const expenseColumns = [
  { key: "date", label: "Date" },
  { key: "description", label: "Remark/Description" },
  { key: "paid_for_artist", label: "Artist" },
  { key: "category", label: "Category" },
  { key: "mode", label: "Mode" },
  {
    key: "amount_out",
    label: "Expense Amount",
    render: (row: Expense) =>
      row.amount_out != null ? `₹${row.amount_out.toLocaleString()}` : "—"
  },
  {
    key: "amount_in",
    label: "Reimbursed Amount",
    render: (row: Expense) =>
      row.amount_in != null ? `₹${row.amount_in.toLocaleString()}` : "—"
  },
  {
    key: "total_expense",
    label: "Final Expense Done",
    render: (row: Expense) =>
      row.total_expense != null ? `₹${Number(row.total_expense).toLocaleString()}` : "—"
  }
];

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  type ExpenseFilters = {
    invoice_no: string;
    category?: string;
    vendor?: string;
    mode?: string;
    description?: string;
    from?: string;
    to?: string;
  };
  const initialFilters: ExpenseFilters = { invoice_no: "" };
  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const fields = useExpenseFields();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", appliedFilters, page, pageSize],
    queryFn: () => api.listExpenses({ ...appliedFilters, page, pageSize })
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const handleSubmit = async (payload: Partial<Expense>) => {
    try {
      const masterDataLocal = await api.listMasterData({ pageSize: 200 });
      const existingCats = new Set((masterDataLocal?.items ?? []).map((r) => (r.expense_category ? String(r.expense_category).trim().toUpperCase() : "")).filter((v) => v.length > 0));
      const existingModes = new Set((masterDataLocal?.items ?? []).map((r) => (r.payment_mode ? String(r.payment_mode).trim().toUpperCase() : "")).filter((v) => v.length > 0));
      const existingArtists = new Set((masterDataLocal?.items ?? []).map((r) => (r.artist ? String(r.artist).trim().toUpperCase() : "")).filter((v) => v.length > 0));

      const cat = (payload.category || "").toString().trim().toUpperCase();
      if (cat && !existingCats.has(cat)) {
        await api.createMasterData({ expense_category: cat });
        existingCats.add(cat);
      }
      const mode = (payload.mode || "").toString().trim().toUpperCase();
      if (mode && !existingModes.has(mode)) {
        await api.createMasterData({ payment_mode: mode });
        existingModes.add(mode);
      }
      const artistTokens = (payload.paid_for_artist || "").toString().split(/[,;]/).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);
      for (const a of artistTokens) {
        if (a && !existingArtists.has(a)) {
          await api.createMasterData({ artist: a });
          existingArtists.add(a);
        }
      }

      if (editing?.id) {
        await api.updateExpense(editing.id, {
          ...editing,
          ...payload
        } as Expense);
        toast.success("Expense updated");
      } else {
        await api.createExpense(payload as Expense);
        toast.success("Expense created");
      }
      setShowForm(false);
      setEditing(null);
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save expense"
      );
    }
  };

  const handleDelete = async (row: Expense) => {
    if (!row.id) return;
    if (!window.confirm(`Delete expense dated ${row.date}?`)) return;
    try {
      await api.deleteExpense(row.id);
      toast.success("Expense deleted");
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete expense"
      );
    }
  };

  return (
    <TableLayout
      title="Expenses"
      description="Record outflows for shoots and artists."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            New Expense
          </button>
          <button
            type="button"
            onClick={() => {
              const rows = [
                [
                  "Date",
                  "Remark/Description",
                  "Artist",
                  "Category",
                  "Mode",
                  "Invoice #",
                  "Expense Amount",
                  "Reimbursed Amount",
                  "Final Expense Done"
                ],
                ...((data?.items ?? []).map((e) => [
                  e.date ?? "",
                  e.description ?? "",
                  e.paid_for_artist ?? "",
                  e.category ?? "",
                  e.mode ?? "",
                  e.invoice_no ?? "",
                  String(e.amount_out ?? 0),
                  String(e.amount_in ?? 0),
                  String(e.total_expense ?? 0)
                ]))
              ];
              const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "expenses.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
          >
            Export CSV
          </button>
        </div>
      }
    >
      {!showForm && (
        <div className="mb-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-slate-600">
              Invoice #
              <AutoCompleteInput
                value={filters.invoice_no}
                onChange={(v) => setFilters({ ...filters, invoice_no: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((e) => e.invoice_no ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Category
              <AutoCompleteInput
                value={filters.category ?? ""}
                onChange={(v) => setFilters({ ...filters, category: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((e) => e.category ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Vendor
              <AutoCompleteInput
                value={filters.vendor ?? ""}
                onChange={(v) => setFilters({ ...filters, vendor: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((e) => e.paid_for_artist ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Mode
              <AutoCompleteInput
                value={filters.mode ?? ""}
                onChange={(v) => setFilters({ ...filters, mode: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((e) => e.mode ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Description
              <AutoCompleteInput
                value={filters.description ?? ""}
                onChange={(v) => setFilters({ ...filters, description: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((e) => e.description ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              From
              <input
                type="date"
                value={filters.from ?? ""}
                onChange={(event) => setFilters({ ...filters, from: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To
              <input
                type="date"
                value={filters.to ?? ""}
                onChange={(event) => setFilters({ ...filters, to: event.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white"
              onClick={() => setFilters(initialFilters)}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setAppliedFilters(filters)}
              className="rounded-lg bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
      {showForm ? (
        <CrudForm<Expense>
          fields={fields}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : (
        <SortableCrudTable<Expense>
          data={data?.items ?? []}
          columns={expenseColumns}
          isLoading={isLoading}
          onEdit={(row) => {
            setEditing(row);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      )}
      {!showForm && (
        <div className="mt-3 flex flex-col gap-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onChange={({ page: p, pageSize: ps }) => {
              setPage(p);
              setPageSize(ps);
            }}
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-semibold">Total Expense Amount:</span> ₹{((data?.items ?? []).reduce((sum, e) => sum + (e.amount_out ?? 0), 0)).toLocaleString()} &nbsp;|&nbsp; 
            <span className="font-semibold">Total Reimbursed:</span> ₹{((data?.items ?? []).reduce((sum, e) => sum + (e.amount_in ?? 0), 0)).toLocaleString()} &nbsp;|&nbsp;
            <span className="font-semibold">Total Final Expense Done:</span> ₹{((data?.items ?? []).reduce((sum, e) => sum + (Number(e.total_expense ?? 0)), 0)).toLocaleString()}
          </div>
        </div>
      )}
    </TableLayout>
  );
}
