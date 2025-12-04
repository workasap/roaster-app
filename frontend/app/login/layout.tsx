import type { ReactNode } from "react";
import Providers from "../providers";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Providers>
        <main className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl">
            {children}
          </div>
        </main>
      </Providers>
    </div>
  );
}

