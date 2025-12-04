"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Shoot } from "@/workerTypes";

interface ShootFormProps {
  initial?: Shoot | null;
  onSubmit: (value: Shoot) => Promise<void> | void;
  onCancel: () => void;
  onDelete?: (value: Shoot) => Promise<void> | void;
}

const emptyShoot: Shoot = {
  inv_date: "",
  invoice_no: "",
  coordinator: "",
  location: "",
  work_type: "",
  description: "",
  shoot_dates: "",
  artist_provided: "",
  total_artists: 0,
  per_day_rate: 0,
  work_days: 0,
  amount: 0,
  received: 0,
  balance: 0,
  status: "PENDING",
  total_expense: 0
};

export default function ShootForm({
  initial,
  onSubmit,
  onCancel,
  onDelete
}: ShootFormProps) {
  const [value, setValue] = useState<Shoot>(initial || emptyShoot);
  const [submitting, setSubmitting] = useState(false);
  const [calc, setCalc] = useState<{
    total: number;
    per_day: number;
    breakdown: { artist: string; amount: number }[];
  } | null>(null);
  const [suggestedRate, setSuggestedRate] = useState(0);
  const [autoInvoice, setAutoInvoice] = useState<boolean>(() => {
    const coord = (initial?.coordinator || "").trim().toUpperCase();
    const inv = (initial?.invoice_no || "").trim().toUpperCase();
    if (!coord || !inv) return true;
    return inv.startsWith(`${coord} -`);
  });

  const { data: masterData } = useQuery({
    queryKey: ["master-data", { pageSize: 200 }],
    queryFn: () => api.listMasterData({ pageSize: 200 })
  });
  const coordinatorOptions = Array.from(
    new Set((masterData?.items ?? []).map((r) => r.coordinator).filter(Boolean))
  ) as string[];
  const workTypeOptions = Array.from(
    new Set((masterData?.items ?? []).map((r) => r.work_type).filter(Boolean))
  ) as string[];
  const { data: shootsForOptions } = useQuery({
    queryKey: ["shoots-options", { pageSize: 200 }],
    queryFn: () => api.listShoots({ pageSize: 200 })
  });
  const locationOptions = Array.from(
    new Set((shootsForOptions?.items ?? []).map((r) => r.location).filter(Boolean))
  ) as string[];

  useEffect(() => {
    setValue(initial || emptyShoot);
  }, [initial]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await api.calculateCoordinatorAmount({
          date: value.inv_date ?? null,
          number_of_artists: Number(value.total_artists ?? 0),
          work_type: value.work_type ?? null,
          per_day_rate: Number(value.per_day_rate ?? 0),
          work_days: Number(value.work_days ?? 1),
          artists: value.artist_provided ?? null
        });
        setCalc({ total: res.total, per_day: res.per_day, breakdown: res.breakdown });
      } catch {
        setCalc(null);
      }
    };
    // Debounce a bit to avoid spamming the API while typing
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [value.inv_date, value.total_artists, value.work_type, value.per_day_rate, value.work_days, value.artist_provided]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const wt = value.work_type || "";
      if (!wt) { setSuggestedRate(0); return; }
      try {
        const res = await api.listShoots({ work_type: wt });
        const rates = (res.items || [])
          .map((s) => Number(s.per_day_rate || 0))
          .filter((n) => Number.isFinite(n) && n > 0)
          .slice(0, 20);
        if (rates.length === 0) { setSuggestedRate(0); return; }
        const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
        setSuggestedRate(avg);
        if (!value.per_day_rate || value.per_day_rate === 0) {
          setValue((prev) => ({ ...prev, per_day_rate: avg }));
        }
      } catch {
        setSuggestedRate(0);
      }
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [value.work_type, value.per_day_rate]);

  const [availability, setAvailability] = useState<Record<string, { booked: string[]; vacation: string[]; conflicts: string[] }> | null>(null);
  const { data: artistOptions } = useQuery({ queryKey: ["artists"], queryFn: () => api.getArtists() });
  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const from = value.shoot_start_date || "";
      const to = value.shoot_end_date || "";
      if (!from || !to || !value.artist_provided) { setAvailability(null); return; }
      try {
        const res = await api.availability(from, to, value.artist_provided);
        setAvailability(res);
      } catch {
        setAvailability(null);
      }
    };
    const t = setTimeout(run, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [value.shoot_start_date, value.shoot_end_date, value.artist_provided]);

  const handleChange = (
    field: keyof Shoot,
    newValue: string | number | null
  ) => {
    setValue((prev) => ({
      ...prev,
      [field]: newValue
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(value);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const raw = value.artist_provided || "";
    const count = raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length;
    if ((value.total_artists ?? 0) !== count) {
      setValue((prev) => ({ ...prev, total_artists: count }));
    }
  }, [value.artist_provided]);

  useEffect(() => {
    const fromStr = value.shoot_start_date || "";
    const toStr = value.shoot_end_date || "";
    if (!fromStr || !toStr) return;
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const diff = Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const days = isFinite(diff) && diff > 0 ? diff : 1;
    if ((value.work_days ?? 0) !== days) {
      setValue((prev) => ({ ...prev, work_days: days }));
    }
  }, [value.shoot_start_date, value.shoot_end_date]);

  useEffect(() => {
    const raw = (value.coordinator || "").trim();
    if (!raw) return;
    const coord = raw.toUpperCase();
    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await api.listShoots({ coordinator: coord, pageSize: 200 });
        const items = res.items || [];
        const nums = items
          .map((s) => {
            const inv = String(s.invoice_no || "");
            const m = inv.match(new RegExp(`^${coord}\\s*-\\s*(\\d+)$`, "i"));
            return m ? parseInt(m[1], 10) : null;
          })
          .filter((n): n is number => Number.isFinite(n));
        const next = (nums.length ? Math.max(...nums) : items.length) + 1;
        setValue((prev) => ({ ...prev, invoice_no: `${coord} - ${next}` }));
        setAutoInvoice(true);
      } catch {}
    };
    const t = setTimeout(run, 200);
    return () => { clearTimeout(t); controller.abort(); };
  }, [value.coordinator]);

  useEffect(() => {
    const artists = Number(value.total_artists ?? 0);
    const rate = Number(value.per_day_rate ?? 0);
    const days = Number(value.work_days ?? 0);
    const amount = artists * rate * days;
    if ((value.amount ?? 0) !== amount) {
      setValue((prev) => ({ ...prev, amount }));
    }
  }, [value.total_artists, value.per_day_rate, value.work_days]);

  useEffect(() => {
    const amount = Number(value.amount ?? 0);
    const received = Number(value.received ?? 0);
    const balance = amount - received;
    const nextStatus = amount > 0 ? (balance === 0 ? "PAID" : received > 0 ? "PARTIAL" : "PENDING") : (value.status ?? "PENDING");
    const needBalance = (value.balance ?? 0) !== balance;
    const needStatus = (value.status ?? "") !== nextStatus;
    if (needBalance || needStatus) {
      setValue((prev) => ({ ...prev, balance, status: nextStatus }));
    }
  }, [value.amount, value.received, value.balance, value.status]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Invoice Date
          </label>
          <input
            type="date"
            required
            value={value.inv_date ?? ""}
            onChange={(e) => handleChange("inv_date", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Invoice No
          </label>
          <input
            type="text"
            required
            value={value.invoice_no ?? ""}
            onChange={(e) => { setAutoInvoice(false); handleChange("invoice_no", e.target.value); }}
            className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 ${autoInvoice ? "bg-slate-50" : ""}`}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Coordinator
          </label>
          <input
            type="text"
            list="coordinatorOptions"
            value={value.coordinator ?? ""}
            onChange={(e) => handleChange("coordinator", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Select from dropdown or type new"
          />
          <datalist id="coordinatorOptions">
            {coordinatorOptions.map((opt) => (
              <option key={opt as string} value={opt as string} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Location
          </label>
          <input
            type="text"
            list="locationOptions"
            value={value.location ?? ""}
            onChange={(e) => handleChange("location", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Select from dropdown or type new"
          />
          <datalist id="locationOptions">
            {locationOptions.map((opt) => (
              <option key={opt as string} value={opt as string} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Work Type
          </label>
          <input
            type="text"
            list="workTypeOptions"
            value={value.work_type ?? ""}
            onChange={(e) => handleChange("work_type", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            placeholder="Select from dropdown or type new"
          />
          <datalist id="workTypeOptions">
            {workTypeOptions.map((opt) => (
              <option key={opt as string} value={opt as string} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Shoot Start Date
          </label>
          <input
            type="date"
            value={value.shoot_start_date ?? ""}
            onChange={(e) => handleChange("shoot_start_date", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Shoot End Date
          </label>
          <input
            type="date"
            value={value.shoot_end_date ?? ""}
            onChange={(e) => handleChange("shoot_end_date", e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">
            Description
          </label>
          <textarea
            value={value.description ?? ""}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-600">Artists</label>
          <select
            multiple
            value={(value.artist_provided ?? "")
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value.trim().toUpperCase());
              handleChange("artist_provided", selected.join(", "));
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 h-36"
          >
            {(artistOptions ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500">Select multiple names (Ctrl/Cmd-click); add new below.</div>
          <input
            type="text"
            placeholder="Add new artist name and press Enter"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const raw = (e.target as HTMLInputElement).value || "";
                const name = raw.trim().toUpperCase();
                if (!name) return;
                const current = (value.artist_provided ?? "")
                  .split(/[,;]/)
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);
                if (!current.includes(name)) {
                  const next = [...current, name];
                  handleChange("artist_provided", next.join(", "));
                }
                (e.target as HTMLInputElement).value = "";
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Total Artists
          </label>
          <input
            type="number"
            value={value.total_artists ?? 0}
            onChange={(e) =>
              handleChange("total_artists", Number(e.target.value) || 0)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Per Day Rate
          </label>
          <input
            type="number"
            value={value.per_day_rate ?? 0}
            onChange={(e) =>
              handleChange("per_day_rate", Number(e.target.value) || 0)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          {suggestedRate > 0 && (
            <div className="text-[11px] text-slate-500">Suggested: ₹{suggestedRate.toLocaleString()}</div>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Work Days
          </label>
          <input
            type="number"
            value={value.work_days ?? 0}
            onChange={(e) =>
              handleChange("work_days", Number(e.target.value) || 0)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Amount
          </label>
          <input
            type="number"
            value={value.amount ?? 0}
            readOnly
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Received
          </label>
          <input
            type="number"
            value={value.received ?? 0}
            onChange={(e) =>
              handleChange("received", Number(e.target.value) || 0)
            }
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">
            Status
          </label>
          <input
            type="text"
            readOnly
            value={value.status ?? "PENDING"}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>
      <div className="flex justify-between gap-2 pt-2">
        {onDelete && value.id && (
          <button
            type="button"
            onClick={async () => {
              const ok = window.confirm("Are you sure you want to delete this entry?");
              if (!ok) return;
              await onDelete(value);
            }}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save Shoot"}
        </button>
      </div>
      {calc && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-slate-600">Computed Per-Day</div>
              <div className="text-sm font-mono">{calc.per_day.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Computed Total</div>
              <div className="text-sm font-mono">{calc.total.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Artists Breakdown</div>
              <div className="text-xs text-slate-700">
                {calc.breakdown.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{b.artist}</span>
                    <span className="font-mono">{b.amount.toLocaleString()}</span>
                  </div>
                ))}
                {calc.breakdown.length > 5 && (
                  <div className="text-[10px] text-slate-500">+{calc.breakdown.length - 5} more</div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs font-semibold text-slate-600">Computed Balance</div>
              <div className="text-sm font-mono">{Number(value.balance ?? 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Current Status</div>
              <div className="text-sm font-mono">{String(value.status ?? "PENDING")}</div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">Grey-cell automation: values are computed live and will be saved automatically on submit.</div>
        </div>
      )}
      {availability && (
        <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-semibold text-red-700">Availability warnings</div>
          <div className="mt-1 text-xs text-red-800">
            {Object.entries(availability).map(([artist, info]) => (
              <div key={artist}>
                {info.conflicts.length > 0 && (
                  <div>
                    <span className="font-semibold">{artist}:</span> conflict on {info.conflicts.join(", ")}
                  </div>
                )}
                {info.conflicts.length === 0 && info.booked.length > 0 && (
                  <div>
                    <span className="font-semibold">{artist}:</span> booked on {info.booked.join(", ")}
                  </div>
                )}
                {info.vacation.length > 0 && (
                  <div>
                    <span className="font-semibold">{artist}:</span> vacation on {info.vacation.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}


