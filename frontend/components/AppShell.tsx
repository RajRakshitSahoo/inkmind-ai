"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload handwriting" },
  { href: "/search", label: "HandSearch" },
  { href: "/ask", label: "Ask My Notes" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-700">
        Loading InkMind AI…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-950/8 bg-white px-4 py-6 md:flex">
        <Link href="/dashboard" className="mb-8 px-2 font-display text-lg italic text-ink-950">
          InkMind AI
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`focus-ring rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-ink-950 text-paper-50"
                  : "text-ink-700 hover:bg-ink-950/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink-950/8 pt-4">
          <p className="px-2 text-sm font-medium text-ink-950">{user.name}</p>
          <p className="px-2 text-xs text-ink-700">{user.role}</p>
          <button
            onClick={logout}
            className="focus-ring mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-950/5"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-paper-50 px-5 py-6 md:px-10 md:py-10">{children}</main>
    </div>
  );
}
