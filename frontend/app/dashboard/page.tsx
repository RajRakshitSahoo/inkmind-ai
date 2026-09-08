"use client";

import Link from "next/link";
import useSWR from "swr";
import AppShell from "@/components/AppShell";
import { api, Document, DashboardStats } from "@/lib/api";
import { Card, StatusPill } from "@/components/ui";

const fetcher = <T,>(path: string) => api.get<T>(path);

export default function DashboardPage() {
  const { data: stats } = useSWR<DashboardStats>("/api/documents/dashboard-stats", fetcher, {
    refreshInterval: 4000,
  });
  const { data: documents } = useSWR<Document[]>("/api/documents", fetcher, { refreshInterval: 4000 });

  const statItems = [
    { label: "Total notes", value: stats?.total_documents },
    { label: "Pages processed", value: stats?.total_pages },
    { label: "Words extracted", value: stats?.words_extracted },
    { label: "Topics found", value: stats?.topics_detected },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-ink-950">Your knowledge base</h1>
          <Link
            href="/upload"
            className="focus-ring rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-medium text-paper-50 hover:bg-ink-900"
          >
            Upload handwriting
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {statItems.map((s) => (
            <Card key={s.label} className="p-5">
              <p className="font-display text-3xl text-ink-950">{s.value ?? "–"}</p>
              <p className="mt-1 text-sm text-ink-700">{s.label}</p>
            </Card>
          ))}
        </div>

        <h2 className="mt-10 text-lg font-semibold text-ink-950">Recent documents</h2>
        {documents && documents.length === 0 && (
          <Card className="mt-4 p-8 text-center">
            <p className="text-ink-950">No notes uploaded yet.</p>
            <p className="mt-1 text-sm text-ink-700">
              Upload your first page of handwriting to see it turn into structured knowledge.
            </p>
            <Link
              href="/upload"
              className="focus-ring mt-4 inline-block rounded-lg bg-ink-950 px-4 py-2.5 text-sm font-medium text-paper-50"
            >
              Upload handwriting
            </Link>
          </Card>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {documents?.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-none">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-ink-950">{doc.title}</h3>
                  <StatusPill status={doc.status} />
                </div>
                <p className="mt-1 text-sm text-ink-700">
                  {doc.subject ? `${doc.subject}${doc.topic ? ` · ${doc.topic}` : ""}` : "Subject not detected yet"}
                </p>
                <p className="mt-3 text-xs text-ink-700">
                  {doc.page_count} page{doc.page_count === 1 ? "" : "s"} · {doc.word_count} words
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
