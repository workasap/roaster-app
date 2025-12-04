"use client";

import { useState } from "react";
import TableLayout from "@/components/TableLayout";

export default function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!userId.trim() || !password.trim()) {
        setError("Please enter user ID and password");
        return;
      }
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        setError(data?.error || "Invalid credentials");
        return;
      }
      window.location.href = "/summary";
    } catch (err) {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TableLayout title="Login" description="Access the Roaster Control Center">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-md space-y-4"
        autoComplete="off"
        aria-busy={loading}
      >
        <label htmlFor="login-user" className="block text-xs font-semibold text-slate-600">
          User ID
        </label>
        <input
          id="login-user"
          name="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="User ID"
          autoComplete="off"
          required
          disabled={loading}
          aria-invalid={!!error && (!userId.trim() || !password.trim())}
        />

        <label htmlFor="login-pass" className="block text-xs font-semibold text-slate-600">
          Password
        </label>
        <input
          id="login-pass"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Password"
          autoComplete="off"
          required
          disabled={loading}
        />

        {error && (
          <p className="text-sm font-medium text-red-600" role="alert" aria-live="polite">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Login"}
        </button>
      </form>
    </TableLayout>
  );
}

