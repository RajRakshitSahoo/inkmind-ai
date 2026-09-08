"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Button, Card } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper-50 px-6 py-10">
      <Card className="w-full max-w-sm p-8">
        <Link href="/" className="font-display text-lg italic text-ink-950">
          InkMind AI
        </Link>
        <h1 className="mt-6 text-xl font-semibold text-ink-950">Create your account</h1>
        <p className="mt-1 text-sm text-ink-700">Start turning handwriting into knowledge.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-950">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
              placeholder="Your name"
            />
          </label>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
              placeholder="At least 6 characters"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-950">I am a</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-700">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink-950 underline underline-offset-2">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
