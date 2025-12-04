"use client";

import type { ReactNode } from "react";

interface TableLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function TableLayout({
  title,
  description,
  actions,
  children
}: TableLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm md:p-6">
        {children}
      </section>
    </div>
  );
}


