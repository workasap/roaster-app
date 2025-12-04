"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import SortableCrudTable from "@/components/SortableCrudTable";
import CrudForm, { type FieldConfig } from "@/components/CrudForm";
import type { MasterData } from "@/workerTypes";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

// fields are built inside the component to include datalist suggestions

const masterColumns = [
  { key: "artist", label: "Artist" },
  { key: "coordinator", label: "Coordinator" },
  { key: "work_type", label: "Work Type" },
  { key: "payment_mode", label: "Payment Mode" },
  { key: "expense_category", label: "Expense Category" }
];

export default function MasterDataPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ q: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MasterData | null>(null);
  const [tab, setTab] = useState<
    "all" | "artist" | "coordinator" | "work_type" | "payment_mode" | "expense_category"
  >("all");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(
    () => new Set(masterColumns.map((c) => String(c.key)))
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useQuery({
    queryKey: ["master-data", appliedFilters, page, pageSize],
    queryFn: () => api.listMasterData({
      q: appliedFilters.q || undefined,
      page,
      pageSize
    })
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedFilters(filters);
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const uniq = (values: (string | null | undefined)[]) =>
    Array.from(new Set(values.filter((v) => v && String(v).trim().length > 0))) as string[];
  const artistOpts = useMemo(() => uniq(items.map((r) => r.artist)), [items]);
  const coordOpts = useMemo(() => uniq(items.map((r) => r.coordinator)), [items]);
  const workTypeOpts = useMemo(() => uniq(items.map((r) => r.work_type)), [items]);
  const paymentModeOpts = useMemo(() => uniq(items.map((r) => r.payment_mode)), [items]);
  const expenseCatOpts = useMemo(() => uniq(items.map((r) => r.expense_category)), [items]);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((r) => {
      const v = (r as Record<string, unknown>)[tab];
      return v != null && String(v).trim().length > 0;
    });
  }, [items, tab]);

  const columnsToShow = useMemo(() => {
    const cols = masterColumns.filter((c) => visibleKeys.has(String(c.key)));
    if (tab !== "all") {
      const primary = masterColumns.find((c) => c.key === tab);
      const rest = cols.filter((c) => c.key !== tab);
      return primary ? [primary, ...rest] : cols;
    }
    return cols;
  }, [visibleKeys, tab]);

  const masterFields: FieldConfig[] = [
    { name: "payment_mode", label: "Payment Mode", type: "text", placeholder: "e.g. CASH/UPI", options: undefined },
    { name: "coordinator", label: "Coordinator", type: "text", placeholder: "Coordinator name" },
    { name: "artist", label: "Artist", type: "text", placeholder: "Artist name" },
    { name: "work_type", label: "Work Type", type: "text", placeholder: "e.g. EVENT/SHOW" },
    { name: "month", label: "Month", type: "text", placeholder: "e.g. JAN" },
    {
      name: "year",
      label: "Year",
      type: "number",
      transform: (value) => (value ? Number(value) : null)
    },
    { name: "expense_category", label: "Expense Category", type: "text", placeholder: "e.g. TRAVEL/FOOD" }
  ];

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["master-data"] });
  };

  const handleSubmit = async (payload: Partial<MasterData>) => {
    try {
      if (editing?.id) {
        await api.updateMasterData(editing.id, { ...editing, ...payload } as MasterData);
        toast.success("Master entry updated");
      } else {
        await api.createMasterData(payload as MasterData);
        toast.success("Master entry created");
      }
      setEditing(null);
      setShowForm(false);
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save entry"
      );
    }
  };

  const handleDelete = async (row: MasterData) => {
    if (!row.id) return;
    if (!window.confirm("Delete this master data entry?")) return;
    try {
      await api.deleteMasterData(row.id);
      toast.success("Entry deleted");
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete entry"
      );
    }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm("Delete selected entries?")) return;
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await api.deleteMasterData(id);
      }
      toast.success("Selected entries deleted");
      setSelected(new Set());
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete selected"
      );
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        const el = document.getElementById("master-search") as HTMLInputElement | null;
        el?.focus();
      } else if (e.key.toLowerCase() === "n") {
        if (!showForm) {
          setEditing(null);
          setShowForm(true);
        }
      } else if (e.key === "Escape") {
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  return (
    <TableLayout
      title="Master Data"
      description="Define coordinators, artists, and payment preferences."
      actions={
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="rounded-lg border border-red-200 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
            >
              Delete Selected ({selected.size})
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            New Entry
          </button>
        </div>
      }
    >
      {!showForm && (
        <div className="mb-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-xs font-semibold text-slate-600">Artists</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{artistOpts.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-xs font-semibold text-slate-600">Coordinators</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{coordOpts.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-xs font-semibold text-slate-600">Work Types</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{workTypeOpts.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-xs font-semibold text-slate-600">Payment Modes</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{paymentModeOpts.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <div className="text-xs font-semibold text-slate-600">Expense Categories</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{expenseCatOpts.length}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              {[
                { k: "all", l: "All" },
                { k: "artist", l: "Artists" },
                { k: "coordinator", l: "Coordinators" },
                { k: "work_type", l: "Work Types" },
                { k: "payment_mode", l: "Payment Modes" },
                { k: "expense_category", l: "Expense Categories" }
              ].map((t) => (
                <button
                  key={t.k}
                  type="button"
                  onClick={() => setTab(t.k as typeof tab)}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    tab === t.k
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
            <label className="flex flex-col">
              Search
              <input
                id="master-search"
                type="text"
                value={filters.q}
                onChange={(event) => setFilters({ q: event.target.value })}
                placeholder="Type to search (press / to focus)"
                className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Columns</span>
              {masterColumns.map((c) => {
                const key = String(c.key);
                const checked = visibleKeys.has(key);
                return (
                  <label key={key} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setVisibleKeys((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                    />
                    <span className="text-slate-700">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {showForm ? (
        <CrudForm<MasterData>
          fields={masterFields.map((f) => ({
            ...f,
            datalistId:
              f.name === "artist"
                ? "artists-list"
                : f.name === "coordinator"
                  ? "coordinators-list"
                  : f.name === "work_type"
                    ? "worktypes-list"
                    : f.name === "payment_mode"
                      ? "paymentmodes-list"
                      : f.name === "expense_category"
                        ? "expensecats-list"
                        : undefined,
            datalistOptions:
              f.name === "artist"
                ? artistOpts
                : f.name === "coordinator"
                  ? coordOpts
                  : f.name === "work_type"
                    ? workTypeOpts
                    : f.name === "payment_mode"
                      ? paymentModeOpts
                      : f.name === "expense_category"
                        ? expenseCatOpts
                        : undefined
          }))}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : (
        <SortableCrudTable<MasterData>
          data={filtered}
          columns={[
            {
              key: "select",
              label: "Select",
              render: (row) => {
                const id = Number((row as MasterData).id ?? -1);
                const checked = id >= 0 && selected.has(id);
                return (
                  <input
                    type="checkbox"
                    disabled={id < 0}
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked && id >= 0) next.add(id);
                      else next.delete(id);
                      setSelected(next);
                    }}
                  />
                );
              }
            },
            ...columnsToShow
          ]}
          hideEmptyColumns
          emptyPlaceholder={"·"}
          isLoading={isLoading}
          onEdit={(row) => {
            setEditing(row);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      )}
      {!showForm && (
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onChange={({ page: p, pageSize: ps }) => {
              setPage(p);
              setPageSize(ps);
            }}
          />
        </div>
      )}
    </TableLayout>
  );
}


