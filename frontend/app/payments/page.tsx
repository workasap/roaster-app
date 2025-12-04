"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import SortableCrudTable from "@/components/SortableCrudTable";
import CrudForm, { type FieldConfig } from "@/components/CrudForm";
import type { Payment } from "@/workerTypes";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";
import AutoCompleteInput from "@/components/AutoCompleteInput";

function usePaymentFields() {
  const { data: masterData } = useQuery({
    queryKey: ["master-data", { pageSize: 200 }],
    queryFn: () => api.listMasterData({ pageSize: 200 })
  });
  const workTypes = Array.from(new Set((masterData?.items ?? []).map((r) => r.work_type).filter(Boolean))) as string[];
  const modes = Array.from(new Set((masterData?.items ?? []).map((r) => r.payment_mode).filter(Boolean))) as string[];
  const paymentFields: FieldConfig[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "received_from", label: "Received From", type: "text", required: true },
    { name: "invoice_no", label: "Invoice #", type: "text", required: true },
    { name: "location", label: "Location", type: "text" },
    { name: "work_type", label: "Work Type", type: "text", placeholder: "Select or type new", datalistId: "workTypesPay", datalistOptions: workTypes },
    { name: "description", label: "Description", type: "text" },
    { name: "payment_mode", label: "Payment Mode", type: "text", placeholder: "Select or type new", datalistId: "modesPay", datalistOptions: modes },
    { name: "amount_received", label: "Amount", type: "number", required: true, transform: (value) => (value ? Number(value) : 0) }
  ];
  return paymentFields;
}

const paymentColumns = [
  { key: "date", label: "Date" },
  { key: "received_from", label: "Received From" },
  { key: "invoice_no", label: "Invoice" },
  { key: "payment_mode", label: "Mode" },
  {
    key: "amount_received",
    label: "Amount",
    render: (row: Payment) =>
      row.amount_received != null ? `₹${row.amount_received.toLocaleString()}` : "—"
  }
];

export default function PaymentsPage() {
  const queryClient = useQueryClient();
  type PaymentFilters = {
    invoice_no: string;
    payment_mode?: string;
    received_from?: string;
    location?: string;
    work_type?: string;
    description?: string;
    from?: string;
    to?: string;
  };
  const initialFilters: PaymentFilters = { invoice_no: "" };
  const [filters, setFilters] = useState<PaymentFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const fields = usePaymentFields();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useQuery({
    queryKey: ["payments", appliedFilters, page, pageSize],
    queryFn: () => api.listPayments({ ...appliedFilters, page, pageSize })
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const handleSubmit = async (payload: Partial<Payment>) => {
    try {
      if (editing?.id) {
        await api.updatePayment(editing.id, { ...editing, ...payload } as Payment);
        toast.success("Payment updated");
      } else {
        await api.createPayment(payload as Payment);
        toast.success("Payment recorded");
      }
      setShowForm(false);
      setEditing(null);
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save payment"
      );
    }
  };

  const handleDelete = async (row: Payment) => {
    if (!row.id) return;
    if (!window.confirm(`Delete payment ${row.invoice_no}?`)) return;
    try {
      await api.deletePayment(row.id);
      toast.success("Payment deleted");
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete payment"
      );
    }
  };

  return (
    <TableLayout
      title="Payments Received"
      description="Track inflows from clients."
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
            New Payment
          </button>
          <button
            type="button"
            onClick={() => {
              const rows = [
                [
                  "Date",
                  "Received From",
                  "Invoice #",
                  "Location",
                  "Work Type",
                  "Description",
                  "Payment Mode",
                  "Amount"
                ],
                ...((data?.items ?? []).map((p) => [
                  p.date ?? "",
                  p.received_from ?? "",
                  p.invoice_no ?? "",
                  p.location ?? "",
                  p.work_type ?? "",
                  p.description ?? "",
                  p.payment_mode ?? "",
                  String(p.amount_received ?? 0)
                ]))
              ];
              const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "payments.csv";
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
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.invoice_no ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Payment Mode
              <AutoCompleteInput
                value={filters.payment_mode ?? ""}
                onChange={(v) => setFilters({ ...filters, payment_mode: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.payment_mode ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Received From
              <AutoCompleteInput
                value={filters.received_from ?? ""}
                onChange={(v) => setFilters({ ...filters, received_from: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.received_from ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Location
              <AutoCompleteInput
                value={filters.location ?? ""}
                onChange={(v) => setFilters({ ...filters, location: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.location ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Work Type
              <AutoCompleteInput
                value={filters.work_type ?? ""}
                onChange={(v) => setFilters({ ...filters, work_type: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.work_type ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Description
              <AutoCompleteInput
                value={filters.description ?? ""}
                onChange={(v) => setFilters({ ...filters, description: v })}
                suggestions={Array.from(new Set((data?.items ?? []).map((p) => p.description ?? "").filter(Boolean)))}
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
        <CrudForm<Payment>
          fields={fields}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : (
        <SortableCrudTable<Payment>
          data={data?.items ?? []}
          columns={paymentColumns}
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
            <span className="font-semibold">Total:</span> ₹{((data?.items ?? []).reduce((sum, p) => sum + (p.amount_received ?? 0), 0)).toLocaleString()}
          </div>
        </div>
      )}
    </TableLayout>
  );
}
