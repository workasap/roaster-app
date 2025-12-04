"use client";

import clsx from "clsx";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (next: { page: number; pageSize: number }) => void;
}

export default function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={clsx(
            "rounded-md border border-slate-200 px-2 py-1",
            canPrev ? "text-slate-700 hover:bg-slate-50" : "text-slate-400"
          )}
          disabled={!canPrev}
          onClick={() => onChange({ page: Math.max(1, page - 1), pageSize })}
        >
          Prev
        </button>
        <button
          type="button"
          className={clsx(
            "rounded-md border border-slate-200 px-2 py-1",
            canNext ? "text-slate-700 hover:bg-slate-50" : "text-slate-400"
          )}
          disabled={!canNext}
          onClick={() => onChange({ page: Math.min(totalPages, page + 1), pageSize })}
        >
          Next
        </button>
        <span className="text-slate-500">Page {page} of {totalPages}</span>
      </div>
      <label className="flex items-center gap-2">
        <span className="text-slate-500">Rows</span>
        <select
          className="rounded-md border border-slate-200 px-2 py-1"
          value={pageSize}
          onChange={(e) => onChange({ page: 1, pageSize: Number(e.target.value) })}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
    </div>
  );
}

