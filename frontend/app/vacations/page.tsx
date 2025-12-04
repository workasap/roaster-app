"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import TableLayout from "@/components/TableLayout";
import SortableCrudTable from "@/components/SortableCrudTable";
import CrudForm, { type FieldConfig } from "@/components/CrudForm";
import type { Vacation } from "@/workerTypes";
import { api } from "@/lib/api";
import Pagination from "@/components/Pagination";

function useVacationFields() {
  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn: () => api.getArtists()
  });
  const vacationFields: FieldConfig[] = [
    { name: "artist", label: "Artist", type: "text", required: true, placeholder: "Select or type new", datalistId: "vacationArtists", datalistOptions: (artists ?? []) },
    { name: "vacation_start", label: "Start", type: "date", required: true },
    { name: "vacation_end", label: "End", type: "date", required: true },
    { name: "reason", label: "Reason", type: "textarea" }
  ];
  return vacationFields;
}

const vacationColumns = [
  { key: "artist", label: "Artist" },
  { key: "vacation_start", label: "Start" },
  { key: "vacation_end", label: "End" },
  { key: "reason", label: "Reason" }
];

export default function VacationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ artist: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vacation | null>(null);
  const fields = useVacationFields();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { data, isLoading } = useQuery({
    queryKey: ["vacations", appliedFilters, page, pageSize],
    queryFn: () => api.listVacations({ ...appliedFilters, page, pageSize })
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["vacations"] });
  };

  const handleSubmit = async (payload: Partial<Vacation>) => {
    try {
      if (editing?.id) {
        await api.updateVacation(editing.id, { ...editing, ...payload } as Vacation);
        toast.success("Vacation updated");
      } else {
        await api.createVacation(payload as Vacation);
        toast.success("Vacation created");
      }
      setEditing(null);
      setShowForm(false);
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save vacation"
      );
    }
  };

  const handleDelete = async (row: Vacation) => {
    if (!row.id) return;
    if (!window.confirm(`Delete vacation for ${row.artist}?`)) return;
    try {
      await api.deleteVacation(row.id);
      toast.success("Vacation deleted");
      await invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete vacation"
      );
    }
  };

  return (
    <TableLayout
      title="Vacations"
      description="Manage artist availability."
      actions={
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          New Vacation
        </button>
      }
    >
      {!showForm && (
        <div className="mb-4 flex flex-wrap items-end gap-3 text-xs font-semibold text-slate-600">
          <label className="flex flex-col">
            Artist
            <input
              type="text"
              list="artistOptions"
              value={filters.artist}
              onChange={(event) => setFilters({ artist: event.target.value })}
              className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <datalist id="artistOptions">
              {(fields.find((f) => f.name === "artist")?.datalistOptions ?? []).map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </label>
          <button
            type="button"
            onClick={() => setAppliedFilters(filters)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-white"
          >
            Apply
          </button>
        </div>
      )}
      {showForm ? (
        <CrudForm<Vacation>
          fields={fields}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : (
        <SortableCrudTable<Vacation>
          data={data?.items ?? []}
          columns={vacationColumns}
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


