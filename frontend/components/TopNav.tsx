"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopNavProps {
  links: { href: string; label: string }[];
}

export default function TopNav({ links }: TopNavProps) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 lg:hidden">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-md px-2 py-1 hover:bg-slate-100">
          {link.label}
        </Link>
      ))}
    </div>
  );
}

