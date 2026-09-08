import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl2 border border-ink-950/8 bg-white shadow-card ${className}`}
      {...props}
    />
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-ink-950 text-paper-50 hover:bg-ink-900",
    secondary: "bg-paper-100 text-ink-950 hover:bg-paper-200 border border-ink-950/10",
    ghost: "text-ink-800 hover:bg-ink-950/5",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "amber" | "moss" }) {
  const tones = {
    neutral: "bg-ink-950/5 text-ink-800",
    amber: "bg-amber-400/15 text-amber-500",
    moss: "bg-moss-400/15 text-moss-500",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function confidenceTone(score: number): "moss" | "amber" | "neutral" {
  if (score >= 85) return "moss";
  if (score >= 60) return "amber";
  return "neutral";
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: "neutral" | "amber" | "moss" }> = {
    uploaded: { label: "Queued", tone: "neutral" },
    enhancing: { label: "Enhancing image", tone: "amber" },
    recognizing: { label: "Reading handwriting", tone: "amber" },
    understanding: { label: "Understanding content", tone: "amber" },
    embedding: { label: "Indexing for search", tone: "amber" },
    complete: { label: "Ready", tone: "moss" },
    failed: { label: "Failed", tone: "neutral" },
  };
  const entry = map[status] || { label: status, tone: "neutral" };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
