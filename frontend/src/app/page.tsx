"use client";
import { useState, Fragment } from "react";
import Link from "next/link";
import {
  FileText, Database, ShoppingBag, Code2, Newspaper,
  ArrowRight, Brain, Upload, Search, Sparkles, CheckCircle2,
  Menu, X, ChevronDown, ChevronUp, ChevronRight,
  GraduationCap, Terminal, Building2,
} from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FileText,
    title: "Personal Docs Q&A",
    problem: "Ask questions about a document without reading all of it.",
    audience: "Works well for researchers, students, lawyers, and anyone who regularly works with long documents.",
    example: "What are the key findings in this report?",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Database,
    title: "Knowledge Base",
    problem: "Give your team one place to search across all your documents.",
    audience: "A good fit for support teams, HR departments, and companies building internal wikis.",
    example: "What is our refund policy?",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: ShoppingBag,
    title: "Product Catalog",
    problem: "Let customers describe what they want and show them what matches.",
    audience: "Works for e-commerce stores, sales teams, and anyone with a structured product list.",
    example: "Recommend a laptop under $1000 for gaming",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Code2,
    title: "Codebase Assistant",
    problem: "Ask questions about any codebase in plain English.",
    audience: "Useful for developers joining a new project or working across unfamiliar code.",
    example: "How does the authentication system work?",
    color: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: Newspaper,
    title: "News Feed Summarizer",
    problem: "Follow many sources and read a summary of what actually matters.",
    audience: "For anyone who wants to stay current without reading through everything themselves.",
    example: "Summarize today's AI news",
    color: "bg-sky-50 text-sky-600",
  },
];

const STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your content",
    desc: "Drop in your documents, code files, or product catalog, or connect an RSS feed. RAGAI handles PDFs, Word documents, CSV, JSON, and source code files with no setup required.",
  },
  {
    icon: Search,
    step: "02",
    title: "Ask in plain English",
    desc: "Type your question the same way you would ask a colleague. RAGAI identifies the most relevant parts of your content and uses them to form the answer.",
  },
  {
    icon: Sparkles,
    step: "03",
    title: "Get clear answers",
    desc: "You get answers drawn from your own content, with source citations so you can verify the reasoning. Switch AI providers at any time from the dashboard.",
  },
];

const USE_CASES = [
  {
    icon: GraduationCap,
    color: "bg-brand-50 text-brand-600",
    title: "For Students",
    subtitle: "Make your study materials searchable",
    desc: "Upload your textbooks, lecture notes, and research papers, then ask questions about them in plain English. RAGAI reads your material and gives you answers that pull directly from the text, which makes studying more efficient and tracking down a specific idea much faster.",
    detail: "Particularly useful when preparing for exams, working through dense reading, or finding a specific passage across several documents.",
  },
  {
    icon: Terminal,
    color: "bg-gray-900 text-green-400",
    title: "For Developers",
    subtitle: "Understand any codebase without reading it all",
    desc: "Index your codebase and ask questions about architecture, functions, and patterns in plain English. You can find where something is defined, understand how a module works, or trace how data moves through the system without opening every file.",
    detail: "Supports Python, JavaScript, TypeScript, Java, Go, Rust, C, C++, Ruby, Shell scripts, and more.",
  },
  {
    icon: Building2,
    color: "bg-indigo-50 text-indigo-600",
    title: "For Businesses",
    subtitle: "Give your team a smarter search",
    desc: "Bring together your company policies, manuals, wikis, and FAQs into one place your team can actually query. Instead of sending an email or waiting for a colleague, anyone can ask a question and get an answer drawn from the documents you already have.",
    detail: "Useful for onboarding new employees, answering repetitive HR questions, and keeping institutional knowledge accessible as your team grows.",
  },
];

const FAQS = [
  {
    q: "Is it really free?",
    a: "Yes, completely free. There is no credit card required, no usage cap, and no hidden fees. Create an account and start uploading documents right away.",
  },
  {
    q: "What file types are supported?",
    a: "RAGAI works with PDFs, Word documents, plain text, Markdown, CSV, and JSON files. For code, it supports Python, JavaScript, TypeScript, Java, Go, Rust, C, C++, Ruby, Shell scripts, and several other languages.",
  },
  {
    q: "How is my data stored?",
    a: "Your files are stored in Supabase cloud storage. The embeddings and metadata that power search are kept in a private pgvector database tied specifically to your account. No other user can access your content.",
  },
  {
    q: "Can I switch AI providers?",
    a: "Yes. The dashboard includes a provider toggle so you can switch between Groq for fast responses and Gemini for stronger reasoning at any time. No restart or configuration is needed.",
  },
  {
    q: "How many documents can I upload?",
    a: "There is no cap on the number of documents you can upload, though individual files are limited to 50 MB. Uploaded files are cleared on the first of each month to keep the platform running well. Your query history is always preserved.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Brain className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">RAGAI</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center min-h-[44px] text-sm font-medium text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center min-h-[44px] text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-xl transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 px-4 sm:px-6 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 md:mb-8">
            <CheckCircle2 className="h-3.5 w-3.5" /> Free to use, no credit card required
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-5 md:mb-6">
            Talk to your data.<br />
            <span className="text-brand-600">Get real answers.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-3 md:mb-4 leading-relaxed">
            Upload your documents, codebase, product catalog, or news feeds and ask questions in plain English. RAGAI finds what you need so you can stop searching and start knowing.
          </p>
          <p className="text-xs sm:text-sm text-gray-400 mb-8 md:mb-10">
            Supports PDFs, Word documents, CSV, JSON, source code files, and RSS feeds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-brand-200 hover:shadow-brand-300 min-h-[48px]"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-8 py-3.5 rounded-xl text-base transition-all min-h-[48px]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Five modes. One platform.</h2>
            <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
              Pick the mode that fits your use case and start getting answers in seconds. No technical setup required.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {FEATURES.map(({ icon: Icon, title, problem, audience, example, color }) => (
              <div
                key={title}
                className="group p-5 md:p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-50 hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className={`inline-flex p-3 rounded-xl ${color} mb-4 w-fit`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm font-medium text-gray-700 mb-1">{problem}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{audience}</p>
                <div className="mt-auto space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Try asking:</p>
                    <div className="bg-gray-950 rounded-lg px-3 py-2 font-mono text-xs text-green-400 leading-relaxed break-words">
                      &ldquo;{example}&rdquo;
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium group-hover:gap-1.5 transition-all"
                  >
                    Try it <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}

            {/* Switchable LLM card */}
            <div className="group p-5 md:p-6 rounded-2xl border border-dashed border-gray-200 hover:border-brand-200 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-center">
              <div className="inline-flex p-3 rounded-xl bg-gray-50 text-gray-500 mb-4 w-fit">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">Your choice of AI</h3>
              <p className="text-sm font-medium text-gray-700 mb-1">Not locked into one provider.</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Switch between Groq for fast responses, Gemini for stronger reasoning, or Ollama for fully private local inference. One click in the dashboard, no configuration required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ──────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Built for every use case</h2>
            <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto">
              Whether you are studying, building, or running a team, RAGAI adapts to how you work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {USE_CASES.map(({ icon: Icon, color, title, subtitle, desc, detail }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-gray-100 p-6 md:p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col"
              >
                <div className={`inline-flex p-3.5 rounded-2xl ${color} mb-5 w-fit`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-0.5">{title}</h3>
                <p className="text-sm font-medium text-brand-600 mb-3">{subtitle}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{desc}</p>
                <p className="mt-auto text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
            <p className="text-gray-500 text-base md:text-lg">From file to answer in three straightforward steps.</p>
          </div>

          {/* Desktop: row with chevron arrows. Mobile: column with vertical line. */}
          <div className="flex flex-col md:flex-row md:items-start gap-0">
            {STEPS.map(({ icon: Icon, step, title, desc }, i) => (
              <Fragment key={step}>
                <div className="flex-1 relative bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <div className="text-7xl font-black text-gray-100 absolute -top-4 -left-2 select-none leading-none">
                    {step}
                  </div>
                  <div className="relative">
                    <div className="bg-brand-600 p-3 rounded-xl w-fit mb-4">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>

                {i < STEPS.length - 1 && (
                  <>
                    {/* Arrow between cards on desktop */}
                    <div className="hidden md:flex items-center justify-center px-3 self-center shrink-0">
                      <ChevronRight className="h-7 w-7 text-brand-300" />
                    </div>
                    {/* Vertical connector on mobile */}
                    <div className="md:hidden flex justify-center py-1">
                      <div className="w-px h-6 bg-brand-200" />
                    </div>
                  </>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Common questions</h2>
            <p className="text-gray-500 text-base md:text-lg">A few things worth knowing before you get started.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors min-h-[56px]"
                >
                  <span className="font-medium text-gray-900 pr-4 text-sm md:text-base">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-5 w-5 text-gray-400 shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">Ready to talk to your data?</h2>
          <p className="text-brand-200 text-base md:text-lg mb-8">Free to use, no credit card required, and you can be up and running in under a minute.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-brand-50 transition-all shadow-xl min-h-[48px]"
          >
            Create your free account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 py-10 md:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5 text-brand-400" />
                <span className="text-white font-semibold">RAGAI</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Ask questions about your documents, codebase, product catalog, or news feeds in plain English. RAGAI finds the answers.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/history" className="text-gray-400 text-sm hover:text-white transition-colors">
                    History
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="text-white text-sm font-semibold mb-4">Account</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/login" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-gray-400 text-sm hover:text-white transition-colors">
                    Sign up free
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-sm">
              © 2026 RAGAI. Made with ❤️ by{" "}
              <a
                href="https://abhinav-reddy-kandula.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Abhinav Reddy Kandula
              </a>
            </p>
            <p className="text-gray-600 text-xs">Built with FastAPI, Next.js &amp; pgvector</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
