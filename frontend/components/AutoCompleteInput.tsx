"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";

interface AutoCompleteInputProps {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export default function AutoCompleteInput({ value, onChange, suggestions, placeholder, className }: AutoCompleteInputProps) {
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const localKey = "ac-history";
  const inputRef = useRef<HTMLInputElement>(null);

  const history = useMemo<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const matches = useMemo(() => {
    const text = value.trim().toUpperCase();
    const list = suggestions
      .filter((s) => String(s).trim().length > 0)
      .map((s) => String(s))
      .sort((a, b) => (history[b.toUpperCase()] || 0) - (history[a.toUpperCase()] || 0));
    if (!text) return list.slice(0, 5);
    const starts = list.filter((s) => s.toUpperCase().startsWith(text));
    const contains = list.filter((s) => s.toUpperCase().includes(text) && !starts.includes(s));
    return [...starts, ...contains].slice(0, 5);
  }, [value, suggestions, history]);

  useEffect(() => setActiveIdx(0), [value]);

  const best = matches[0] || "";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 100)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" && best) {
            e.preventDefault();
            onChange(best);
            const key = best.toUpperCase();
            const next = { ...history, [key]: (history[key] || 0) + 1 };
            try { localStorage.setItem(localKey, JSON.stringify(next)); } catch {}
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => Math.min(matches.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter") {
            if (matches[activeIdx]) {
              onChange(matches[activeIdx]);
            }
          }
        }}
        placeholder={placeholder}
        className={clsx("mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm", className)}
      />
      {focused && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
          {matches.map((m, idx) => (
            <div
              key={m}
              onMouseDown={() => onChange(m)}
              className={clsx(
                "cursor-pointer px-3 py-2 text-sm",
                idx === activeIdx ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50"
              )}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

