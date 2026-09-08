"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import AppShell from "@/components/AppShell";
import {
  api,
  fileUrl,
  DocumentDetail,
  Summary,
  Question,
} from "@/lib/api";
import { Badge, Button, Card, StatusPill, confidenceTone } from "@/components/ui";

const fetcher = <T,>(path: string) => api.get<T>(path);
const TABS = ["Original", "Enhanced", "Recognized Text", "Summary", "Questions"] as const;
type Tab = (typeof TABS)[number];

const PROCESSING_STAGES = [
  { key: "uploaded", label: "Upload complete" },
  { key: "enhancing", label: "Image enhancement" },
  { key: "recognizing", label: "Handwriting recognition" },
  { key: "understanding", label: "Understanding content" },
  { key: "embedding", label: "Creating embeddings" },
  { key: "complete", label: "Ready" },
];

export default function DocumentPage() {
  const { id } = useParams<{ id: string }>();
  const docPath = `/api/documents/${id}`;
  const { data: doc } = useSWR<DocumentDetail>(docPath, fetcher, {
    refreshInterval: (d) => (d && ["complete", "failed"].includes(d.status) ? 0 : 2000),
  });
  const [pageIndex, setPageIndex] = useState(0);
  const [tab, setTab] = useState<Tab>("Recognized Text");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: summaries, mutate: mutateSummaries } = useSWR<Summary[]>(
    doc?.status === "complete" ? `/api/documents/${id}/summaries` : null,
    fetcher
  );
  const { data: questions, mutate: mutateQuestions } = useSWR<Question[]>(
    doc?.status === "complete" ? `/api/documents/${id}/questions` : null,
    fetcher
  );

  if (!doc) {
    return (
      <AppShell>
        <p className="text-ink-700">Loading document…</p>
      </AppShell>
    );
  }

  const page = doc.pages[pageIndex];
  const stageIndex = PROCESSING_STAGES.findIndex((s) => s.key === doc.status);
  const isProcessing = !["complete", "failed"].includes(doc.status);

  async function saveCorrection() {
    if (!page) return;
    setSaving(true);
    try {
      await api.put(`/api/documents/${id}/pages/${page.id}/text`, { corrected_text: draft });
      await mutate(docPath);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function generateSummary(level: string) {
    await api.post(`/api/documents/${id}/summary`, { level });
    mutateSummaries();
  }

  async function generateQuestions() {
    await api.post(`/api/documents/${id}/questions`, { types: ["mcq", "short", "flashcard"], count: 5 });
    mutateQuestions();
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-ink-950">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={doc.status} />
              {doc.subject && <Badge>{doc.subject}</Badge>}
              {doc.topic && <Badge tone="amber">{doc.topic}</Badge>}
            </div>
          </div>
        </div>

        {isProcessing && (
          <Card className="mt-6 p-6">
            <p className="mb-4 text-sm font-medium text-ink-950">Processing document</p>
            <ul className="flex flex-col gap-2">
              {PROCESSING_STAGES.slice(0, -1).map((stage, i) => {
                const done = stageIndex > i || doc.status === "complete";
                const active = stageIndex === i;
                return (
                  <li key={stage.key} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                        done ? "bg-moss-500 text-white" : active ? "bg-amber-400 text-white" : "bg-ink-950/10"
                      }`}
                    >
                      {done ? "✓" : active ? "●" : "○"}
                    </span>
                    <span className={done || active ? "text-ink-950" : "text-ink-700"}>{stage.label}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}

        {doc.status === "failed" && (
          <Card className="mt-6 border-red-200 p-6">
            <p className="text-sm font-medium text-red-600">Processing failed</p>
            <p className="mt-1 text-sm text-ink-700">
              {doc.status_detail || "Something went wrong while reading this document."}
            </p>
          </Card>
        )}

        {doc.pages.length > 0 && (
          <>
            {/* Page navigation */}
            {doc.pages.length > 1 && (
              <div className="mt-6 flex items-center gap-3 text-sm">
                <Button
                  variant="secondary"
                  onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                  disabled={pageIndex === 0}
                >
                  Previous
                </Button>
                <span className="text-ink-700">
                  Page {pageIndex + 1} / {doc.pages.length}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setPageIndex((i) => Math.min(doc.pages.length - 1, i + 1))}
                  disabled={pageIndex === doc.pages.length - 1}
                >
                  Next
                </Button>
              </div>
            )}

            {/* Tabs */}
            <div className="mt-6 flex flex-wrap gap-1 border-b border-ink-950/10">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`focus-ring rounded-t-lg px-3 py-2 text-sm font-medium ${
                    tab === t ? "border-b-2 border-ink-950 text-ink-950" : "text-ink-700 hover:text-ink-950"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {tab === "Original" && page && (
                <Card className="overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl(page.original_path)} alt={`Original page ${page.page_number}`} className="w-full" />
                </Card>
              )}

              {tab === "Enhanced" && page && (
                <Card className="overflow-hidden">
                  {page.enhanced_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fileUrl(page.enhanced_path)} alt={`Enhanced page ${page.page_number}`} className="w-full" />
                  ) : (
                    <p className="p-6 text-sm text-ink-700">Enhancement not ready yet.</p>
                  )}
                  {page.quality_data && (
                    <div className="border-t border-ink-950/8 p-5 text-sm">
                      <p className="font-medium text-ink-950">Handwriting quality</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-ink-700 sm:grid-cols-4">
                        <p>Image quality: {page.quality_data.image_quality}%</p>
                        <p>Lighting: {page.quality_data.lighting}</p>
                        <p>Sharpness: {page.quality_data.sharpness}</p>
                        <p>Skew: {page.quality_data.skew}</p>
                      </div>
                      {page.quality_data.recommendation && (
                        <p className="mt-2 text-amber-500">{page.quality_data.recommendation}</p>
                      )}
                    </div>
                  )}
                </Card>
              )}

              {tab === "Recognized Text" && page && (
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-950">
                      {editing ? "Editing recognized text" : "Recognized text with confidence"}
                    </p>
                    {!editing ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setDraft(page.corrected_text || page.raw_text || "");
                          setEditing(true);
                        }}
                      >
                        Edit text
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => setEditing(false)}>
                          Cancel
                        </Button>
                        <Button onClick={saveCorrection} disabled={saving}>
                          {saving ? "Saving…" : "Save changes"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={10}
                      className="focus-ring w-full rounded-lg border border-ink-950/15 p-3 text-sm leading-relaxed"
                    />
                  ) : page.confidence_data && page.confidence_data.length > 0 ? (
                    <p className="text-base leading-relaxed">
                      {page.confidence_data.map((w, i) => (
                        <span
                          key={i}
                          title={`${w.confidence}% confidence`}
                          className={`mr-1 rounded px-0.5 ${
                            confidenceTone(w.confidence) === "moss"
                              ? "text-ink-950"
                              : confidenceTone(w.confidence) === "amber"
                              ? "bg-amber-400/20 text-ink-950"
                              : "bg-red-100 text-ink-950 underline decoration-red-400 decoration-2"
                          }`}
                        >
                          {w.word}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-base leading-relaxed text-ink-950">
                      {page.corrected_text || page.raw_text || "No text recognized yet."}
                    </p>
                  )}

                  <div className="mt-4 flex gap-3 text-xs text-ink-700">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-ink-950/60" /> High confidence
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Medium confidence
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-400" /> Low confidence
                    </span>
                  </div>
                </Card>
              )}

              {tab === "Summary" && (
                <Card className="p-6">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {["short", "medium", "detailed"].map((level) => (
                      <Button key={level} variant="secondary" onClick={() => generateSummary(level)}>
                        Generate {level}
                      </Button>
                    ))}
                  </div>
                  {!summaries || summaries.length === 0 ? (
                    <p className="text-sm text-ink-700">No summary yet — generate one above.</p>
                  ) : (
                    <div className="flex flex-col gap-5">
                      {[...summaries].reverse().map((s) => (
                        <div key={s.id} className="border-t border-ink-950/8 pt-4 first:border-none first:pt-0">
                          <Badge>{s.level}</Badge>
                          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-950">{s.content}</p>
                          {s.keywords && s.keywords.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {s.keywords.map((k) => (
                                <Badge key={k} tone="amber">
                                  {k}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {tab === "Questions" && (
                <Card className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-medium text-ink-950">Note2Exam</p>
                    <Button variant="secondary" onClick={generateQuestions}>
                      Generate questions
                    </Button>
                  </div>
                  {!questions || questions.length === 0 ? (
                    <p className="text-sm text-ink-700">No questions yet — generate a set above.</p>
                  ) : (
                    <ol className="flex flex-col gap-4">
                      {questions.map((q, i) => (
                        <li key={q.id} className="border-t border-ink-950/8 pt-4 first:border-none first:pt-0">
                          <div className="flex items-center gap-2">
                            <Badge>{q.type}</Badge>
                          </div>
                          <p className="mt-2 text-sm font-medium text-ink-950">
                            {i + 1}. {q.prompt}
                          </p>
                          {q.options && (
                            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-700">
                              {q.options.map((o) => (
                                <li key={o} className={o === q.answer ? "font-medium text-moss-500" : ""}>
                                  — {o}
                                </li>
                              ))}
                            </ul>
                          )}
                          {!q.options && q.answer && (
                            <p className="mt-2 text-sm text-ink-700">
                              <span className="font-medium text-ink-950">Answer: </span>
                              {q.answer}
                            </p>
                          )}
                          {q.explanation && <p className="mt-1 text-xs text-ink-700">{q.explanation}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
