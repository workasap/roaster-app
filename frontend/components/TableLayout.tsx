"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const parts = (pathname || "/").split("/").filter(Boolean);
  const crumbs = [{ href: "/", label: "Home" }, ...parts.map((p, i) => ({
    href: `/${parts.slice(0, i + 1).join("/")}`,
    label: p.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }))];
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
          <nav aria-label="Breadcrumb" className="mt-2">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
              {crumbs.map((c, idx) => (
                <li key={c.href} className="flex items-center gap-1">
                  <a href={c.href} className="rounded px-1 py-0.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200">
                    {c.label}
                  </a>
                  {idx < crumbs.length - 1 && <span aria-hidden="true" className="text-slate-400">/</span>}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm md:p-6">
        {children}
      </section>
    </div>
  );
}


