"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { api, ChatSource } from "@/lib/api";
import { Button, Card } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string; sources?: ChatSource[] };

const SUGGESTIONS = [
  "Summarize my notes on this topic.",
  "Explain this topic like I'm a beginner.",
  "What should I revise?",
  "Create a short quiz from my notes.",
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.post<{ reply: string; sources: ChatSource[] }>("/api/chat", { message: text });
      setMessages((m) => [...m, { role: "assistant", content: res.reply, sources: res.sources }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong reaching your notes. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-3xl flex-col">
        <h1 className="font-display text-3xl text-ink-950">Ask My Notes</h1>
        <p className="mt-1 text-sm text-ink-700">
          Answers are grounded in your uploaded handwriting — not general knowledge.
        </p>

        <div className="mt-6 flex-1 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="focus-ring rounded-full border border-ink-950/15 bg-white px-3 py-1.5 text-sm text-ink-800 hover:bg-paper-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={m.role === "user" ? "max-w-[80%]" : "max-w-[85%]"}>
                  <Card
                    className={`p-4 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-ink-950 text-paper-50" : "bg-white text-ink-950"
                    }`}
                  >
                    {m.content}
                  </Card>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m.sources.map((s, si) => (
                        <Link
                          key={si}
                          href={`/documents/${s.document_id}`}
                          className="focus-ring rounded-full border border-ink-950/15 bg-white px-2.5 py-1 text-xs text-ink-700 hover:bg-paper-100"
                        >
                          {s.document_title} — page {s.page_number}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <p className="text-sm text-ink-700">Reading your notes…</p>}
          </div>
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-4 flex gap-2 border-t border-ink-950/8 pt-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something about your notes…"
            className="focus-ring flex-1 rounded-lg border border-ink-950/15 px-3 py-2.5 text-sm"
          />
          <Button type="submit" disabled={loading}>
            Send
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
