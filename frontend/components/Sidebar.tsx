"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarProps {
  links: { href: string; label: string }[];
}

export default function Sidebar({ links }: SidebarProps) {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white/80 px-4 py-6 shadow-sm lg:flex lg:flex-col">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Navigation
        </p>
      </div>
      <nav className="space-y-1 text-sm">
        {links.map((link) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "block rounded-md px-3 py-2 font-medium",
                isActive
                  ? "bg-brand-100 text-brand-800"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


