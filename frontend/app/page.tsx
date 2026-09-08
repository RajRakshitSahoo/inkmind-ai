import Link from "next/link";
import { Button, Card } from "@/components/ui";

const steps = [
  { n: "1", title: "Upload", body: "Photograph or scan handwritten notes, assignments, or study material." },
  { n: "2", title: "Recognize", body: "Enhancement and handwriting recognition turn ink into text, with confidence shown per word." },
  { n: "3", title: "Understand", body: "The subject, topic, keywords, and key concepts are pulled out automatically." },
  { n: "4", title: "Learn", body: "Search across every page, ask questions, and generate quizzes from what you wrote." },
];

const features = [
  { title: "Handwriting recognition", body: "Built for messy, real handwriting — not clean typed scans." },
  { title: "Context-aware correction", body: "OCR slips get corrected using sentence and subject context, never silently." },
  { title: "Ask My Notes", body: "Chat with your own notes. Answers cite the page they came from." },
  { title: "Note2Exam", body: "Turn any page into MCQs, short-answer questions, and flashcards." },
  { title: "HandSearch", body: "Semantic search finds the right page even without the exact words." },
  { title: "Personal knowledge base", body: "Every subject and topic organized automatically as you upload." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-xl italic text-ink-950">InkMind AI</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="focus-ring rounded-lg px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-950/5">
            Log in
          </Link>
          <Link href="/register">
            <Button>Try InkMind AI</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-14 md:grid-cols-2 md:py-20">
        <div>
          <h1 className="font-display text-5xl leading-[1.05] text-ink-950 md:text-6xl">
            From handwriting
            <br />
            to knowledge.
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-700">
            Upload handwritten notes and InkMind AI reads them, corrects the rough edges, and turns
            them into something you can search, question, and study from.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register">
              <Button className="px-6 py-3 text-base">Try InkMind AI</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-6 py-3 text-base">
                See how it works
              </Button>
            </Link>
          </div>
        </div>

        {/* Handwriting -> structured knowledge mockup */}
        <div className="relative">
          <Card className="rotate-[-3deg] p-6">
            <p className="mb-3 text-xs font-medium text-ink-700">Page 1 — original</p>
            <p className="font-[var(--font-caveat)] text-2xl leading-relaxed text-ink-900">
              Photosynthesls is the process by which green plants prepare their
              food using sunlight. Chlorophyl absorbs the light...
            </p>
          </Card>
          <Card className="absolute -bottom-10 -right-6 w-[85%] rotate-[2deg] bg-ink-950 p-6 text-paper-50 md:-right-10">
            <p className="mb-3 text-xs font-medium text-paper-200/70">Recognized &amp; understood</p>
            <p className="mb-4 text-sm leading-relaxed text-paper-100">
              Photosynthesis is the process by which green plants prepare their food using sunlight.
              Chlorophyll absorbs the light...
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-xs text-amber-400">Biology</span>
              <span className="rounded-full bg-paper-50/10 px-2.5 py-1 text-xs text-paper-100">Photosynthesis</span>
              <span className="rounded-full bg-paper-50/10 px-2.5 py-1 text-xs text-paper-100">Chlorophyll</span>
            </div>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl text-ink-950">How it works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-display text-2xl italic text-amber-500">{s.n}</span>
              <h3 className="mt-2 text-base font-semibold text-ink-950">{s.title}</h3>
              <p className="mt-1 text-sm text-ink-700">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-display text-3xl text-ink-950">Everything your notes can become</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <h3 className="text-base font-semibold text-ink-950">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-700">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Card className="flex flex-col items-start justify-between gap-6 bg-ink-950 p-10 text-paper-50 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-3xl">Turn your handwriting into knowledge.</h2>
            <p className="mt-2 max-w-md text-paper-200/80">No account needed to see it in action.</p>
          </div>
          <Link href="/login?demo=1">
            <Button variant="secondary" className="whitespace-nowrap px-6 py-3 text-base">
              Try the demo
            </Button>
          </Link>
        </Card>
      </section>

      <footer className="border-t border-ink-950/8 py-8 text-center text-sm text-ink-700">
        InkMind AI — an AI-powered handwriting understanding and personal knowledge platform.
      </footer>
    </div>
  );
}
