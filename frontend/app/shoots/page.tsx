"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import ShootsTable from "./components/ShootsTable";
import ShootForm from "./components/ShootForm";
import type { Shoot } from "@/workerTypes";
import { api } from "@/lib/api";
import { useQuery as useMasterQuery } from "@tanstack/react-query";
import Pagination from "@/components/Pagination";
import AutoCompleteInput from "@/components/AutoCompleteInput";

export default function ShootsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    invoice_no: "",
    coordinator: "",
    location: "",
    from: "",
    to: ""
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [sortKey, setSortKey] = useState<"inv_date" | "amount" | "status">(
    "inv_date"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useQuery({
    queryKey: ["shoots", appliedFilters, page, pageSize],
    queryFn: () => api.listShoots({ ...appliedFilters, page, pageSize })
  });

  const sortedShoots = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "amount") {
        const left = a.amount ?? 0;
        const right = b.amount ?? 0;
        return (left - right) * dir;
      }
      if (sortKey === "status") {
        return (a.status || "").localeCompare(b.status || "") * dir;
      }
      return (a.inv_date || "").localeCompare(b.inv_date || "") * dir;
    });
  }, [data, sortKey, sortDir]);

  const [editing, setEditing] = useState<Shoot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { data: masterData } = useMasterQuery({ queryKey: ["master-data", { pageSize: 200 }], queryFn: () => api.listMasterData({ pageSize: 200 }) });
  const coordinatorOptions = Array.from(new Set((masterData?.items ?? []).map((r) => r.coordinator).filter(Boolean))) as string[];
  const locationOptions = Array.from(new Set((data?.items ?? []).map((r) => r.location).filter(Boolean))) as string[];

  const handleSaved = async () => {
    await queryClient.invalidateQueries({ queryKey: ["shoots"] });
    setShowForm(false);
    setEditing(null);
  };

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (shoot: Shoot) => {
    setEditing(shoot);
    setShowForm(true);
  };


  const handleSubmit = async (value: Shoot) => {
    try {
      const existingArtists = new Set(
        (masterData?.items ?? [])
          .map((r) => (r.artist ? String(r.artist).trim().toUpperCase() : ""))
          .filter((v) => v.length > 0)
      );
      const existingCoordinators = new Set(
        (masterData?.items ?? [])
          .map((r) => (r.coordinator ? String(r.coordinator).trim().toUpperCase() : ""))
          .filter((v) => v.length > 0)
      );
      const existingWorkTypes = new Set(
        (masterData?.items ?? [])
          .map((r) => (r.work_type ? String(r.work_type).trim().toUpperCase() : ""))
          .filter((v) => v.length > 0)
      );

      const artistList = (value.artist_provided || "")
        .split(/[,;]/)
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0);
      for (const a of artistList) {
        if (!existingArtists.has(a)) {
          await api.createMasterData({ artist: a });
          existingArtists.add(a);
        }
      }

      const coord = (value.coordinator || "").trim().toUpperCase();
      if (coord && !existingCoordinators.has(coord)) {
        await api.createMasterData({ coordinator: coord });
        existingCoordinators.add(coord);
      }

      const wt = (value.work_type || "").trim().toUpperCase();
      if (wt && !existingWorkTypes.has(wt)) {
        await api.createMasterData({ work_type: wt });
        existingWorkTypes.add(wt);
      }

      if (editing?.id) {
        await api.updateShoot(editing.id, value);
        toast.success("Shoot updated");
      } else {
        await api.createShoot(value);
        toast.success("Shoot created");
      }
      await handleSaved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save shoot"
      );
    }
  };

  return (
    <TableLayout
      title="Shoots"
      description="Track shoots, invoices, payments, and balances."
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            New Shoot
          </button>
          <button
            type="button"
            onClick={() => {
              const rows = [
                [
                  "Date",
                  "Invoice #",
                  "Coordinator",
                  "Location",
                  "Work Type",
                  "Artists",
                  "Total Artists",
                  "Per Day Rate",
                  "Work Days",
                  "Amount",
                  "Received",
                  "Balance",
                  "Status"
                ],
                ...((sortedShoots ?? []).map((s) => [
                  s.inv_date ?? "",
                  s.invoice_no ?? "",
                  s.coordinator ?? "",
                  s.location ?? "",
                  s.work_type ?? "",
                  s.artist_provided ?? "",
                  String(s.total_artists ?? 0),
                  String(s.per_day_rate ?? 0),
                  String(s.work_days ?? 0),
                  String(s.amount ?? 0),
                  String(s.received ?? 0),
                  String(s.balance ?? 0),
                  s.status ?? ""
                ]))
              ];
              const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = rows.map((r) => r.map((c) => esc(c)).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "shoots.csv";
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
                onChange={(v) => setFilters((prev) => ({ ...prev, invoice_no: v }))}
                suggestions={Array.from(new Set((data?.items ?? []).map((s) => s.invoice_no ?? "").filter(Boolean)))}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Coordinator
              <AutoCompleteInput
                value={filters.coordinator}
                onChange={(v) => setFilters((prev) => ({ ...prev, coordinator: v }))}
                suggestions={coordinatorOptions as string[]}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Location
              <AutoCompleteInput
                value={filters.location}
                onChange={(v) => setFilters((prev) => ({ ...prev, location: v }))}
                suggestions={locationOptions as string[]}
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              From
              <input
                type="date"
                value={filters.from}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    from: event.target.value
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To
              <input
                type="date"
                value={filters.to}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    to: event.target.value
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                Sort by
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as typeof sortKey)
                  }
                >
                  <option value="inv_date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <label className="flex items-center gap-2">
                Direction
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  value={sortDir}
                  onChange={(event) =>
                    setSortDir(event.target.value as typeof sortDir)
                  }
                >
                  <option value="desc">Desc</option>
                  <option value="asc">Asc</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-white"
                onClick={() => setFilters({ invoice_no: "", coordinator: "", location: "", from: "", to: "" })}
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-50 px-3 py-2 font-semibold text-brand-700"
                onClick={() => setAppliedFilters(filters)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {showForm ? (
        <ShootForm
          initial={editing}
          onSubmit={handleSubmit}
          onDelete={async (shoot) => {
            if (!shoot.id) return;
            const ok = window.confirm("Are you sure you want to delete this entry?");
            if (!ok) return;
            try {
              await api.deleteShoot(shoot.id);
              toast.success("Shoot deleted");
              await queryClient.invalidateQueries({ queryKey: ["shoots"] });
              setShowForm(false);
              setEditing(null);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to delete shoot");
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : (
        <ShootsTable
          shoots={data?.items ?? []}
          onEdit={handleEdit}
          isLoading={isLoading}
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
            <span className="font-semibold">Total Amount:</span> ₹{((data?.items ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0)).toLocaleString()} &nbsp;|&nbsp;
            <span className="font-semibold">Total Received:</span> ₹{((data?.items ?? []).reduce((sum, s) => sum + (s.received ?? 0), 0)).toLocaleString()} &nbsp;|&nbsp;
            <span className="font-semibold">Total Balance:</span> ₹{((data?.items ?? []).reduce((sum, s) => sum + (s.balance ?? 0), 0)).toLocaleString()}
          </div>
        </div>
      )}
    </TableLayout>
  );
}


