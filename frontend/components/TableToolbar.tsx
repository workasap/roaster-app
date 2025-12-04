"use client";

import { useMemo } from "react";
import clsx from "clsx";

interface TableToolbarProps {
  onAddRow: () => void;
  onAddColumn: () => void;
  onRefresh: () => Promise<void> | void;
  onSave: () => Promise<void> | void;
  disabled?: boolean;
  isSaving?: boolean;
  isRefreshing?: boolean;
  isDirty?: boolean;
}

export default function TableToolbar({
  onAddRow,
  onAddColumn,
  onRefresh,
  onSave,
  disabled,
  isSaving,
  isRefreshing,
  isDirty
}: TableToolbarProps) {
  const saveLabel = useMemo(
    () => (isSaving ? "Saving…" : isDirty ? "Save Changes" : "Saved"),
    [isDirty, isSaving]
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onAddRow}
          disabled={disabled}
        >
          + Add Row
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onAddColumn}
          disabled={disabled}
        >
          + Add Column
        </button>
        <button
          type="button"
          className={clsx(
            "rounded-md border border-slate-200 px-3 py-2 text-sm font-medium",
            isRefreshing
              ? "cursor-wait bg-slate-50 text-slate-400"
              : "bg-white text-slate-700 hover:bg-slate-50"
          )}
          onClick={onRefresh}
          disabled={disabled || isRefreshing}
        >
          {isRefreshing ? "Refreshing…" : "Refresh Data"}
        </button>
      </div>
      <button
        type="button"
        className={clsx(
          "rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm",
          isDirty
            ? "bg-brand-600 hover:bg-brand-700"
            : "bg-slate-400 text-slate-100",
          isSaving && "cursor-wait opacity-80"
        )}
        onClick={onSave}
        disabled={!isDirty || disabled || isSaving}
      >
        {saveLabel}
      </button>
    </div>
  );
}

