"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, DragEvent } from "react";
import AppShell from "@/components/AppShell";
import { api, ApiError, Document } from "@/lib/api";
import { Button, Card } from "@/components/ui";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (files.length === 0) {
      setError("Add at least one page image to upload.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title || files[0].name);
      files.forEach((f) => formData.append("files", f));
      const doc = await api.upload<Document>("/api/documents", formData);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-ink-950">Upload handwriting</h1>
        <p className="mt-1 text-sm text-ink-700">
          JPG, PNG, WEBP, or PDF. Add every page of the same document together.
        </p>

        <Card className="mt-6 p-6">
          <label className="text-sm">
            <span className="mb-1.5 block font-medium text-ink-950">Document title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology — Photosynthesis notes"
              className="focus-ring w-full rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
            />
          </label>

          <div
            onDragOver={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e: DragEvent) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`focus-ring mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragOver ? "border-ink-950 bg-ink-950/5" : "border-ink-950/20"
            }`}
          >
            <p className="text-sm font-medium text-ink-950">Drag and drop pages here</p>
            <p className="mt-1 text-xs text-ink-700">or click to browse your files</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-paper-100 px-3 py-2 text-sm"
                >
                  <span className="truncate text-ink-950">
                    Page {i + 1} — {f.name}
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="focus-ring rounded px-2 text-ink-700 hover:text-ink-950"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <Button onClick={handleSubmit} disabled={submitting} className="mt-6 w-full">
            {submitting ? "Uploading…" : "Upload and process"}
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}
