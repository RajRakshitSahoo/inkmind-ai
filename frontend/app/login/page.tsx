"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, Card } from "@/components/ui";

function LoginForm() {
  const { login, loginDemo } = useAuth();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(params.get("demo") === "1");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      await loginDemo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the demo. Try again.");
      setDemoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <Card className="w-full max-w-sm p-8">
        <Link href="/" className="font-display text-lg italic text-ink-950">
          InkMind AI
        </Link>
        <h1 className="mt-6 text-xl font-semibold text-ink-950">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-700">Log in to keep working on your notes.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-950">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
              placeholder="you@school.edu"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-950">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-ink-700">
          <div className="h-px flex-1 bg-ink-950/10" />
          or
          <div className="h-px flex-1 bg-ink-950/10" />
        </div>

        <Button variant="secondary" onClick={handleDemo} disabled={demoLoading} className="w-full">
          {demoLoading ? "Starting demo…" : "Try the demo (no account needed)"}
        </Button>

        <p className="mt-6 text-center text-sm text-ink-700">
          New here?{" "}
          <Link href="/register" className="font-medium text-ink-950 underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
