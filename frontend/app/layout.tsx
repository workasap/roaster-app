import type { Metadata } from "next";
import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import TopNav from "@/components/TopNav";

const inter = Inter({ subsets: ["latin"] });

const NAV_LINKS = [
  { href: "/shoots", label: "Shoots" },
  { href: "/expenses", label: "Expenses" },
  { href: "/payments", label: "Payments" },
  { href: "/vacations", label: "Vacations" },
  { href: "/master-data", label: "Master Data" },
  { href: "/roaster", label: "Smart Roaster" },
  { href: "/availability", label: "Availability" },
  { href: "/summary", label: "Monthly Summary" },
  { href: "/yearly", label: "Yearly Summary" }
];

export const metadata: Metadata = {
  title: "Roaster Control Center",
  description:
    "Cloud-native replacement for the Excel-based Cine Flakes roaster workflow."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar links={NAV_LINKS} />
            <div className="flex-1">
              <TopNav links={NAV_LINKS} />
              <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:rounded-md focus:bg-white focus:px-2 focus:py-1">Skip to content</a>
              <main id="main">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
