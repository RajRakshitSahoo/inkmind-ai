"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api } from "@/lib/api";
import { Button, Card } from "@/components/ui";

type Result = {
  document_id: number;
  document_title: string;
  page_number: number;
  snippet: string;
  relevance: number;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api.get<Result[]>(`/api/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-ink-950">HandSearch</h1>
        <p className="mt-1 text-sm text-ink-700">
          Find the right handwritten page, even if the exact words aren&apos;t there.
        </p>

        <form onSubmit={runSearch} className="mt-6 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Newton's laws"
            className="focus-ring flex-1 rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Search"}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          {results?.length === 0 && <p className="text-sm text-ink-700">No matching pages found.</p>}
          {results?.map((r, i) => (
            <Link key={i} href={`/documents/${r.document_id}`}>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-ink-950">
                    {r.document_title} — page {r.page_number}
                  </p>
                  <span className="text-xs text-ink-700">{Math.round(r.relevance * 100)}% match</span>
                </div>
                <p className="mt-1.5 text-sm text-ink-700">{r.snippet}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
