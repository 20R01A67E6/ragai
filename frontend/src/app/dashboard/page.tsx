"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PersonalDocs } from "@/components/modes/PersonalDocs";
import { KnowledgeBase } from "@/components/modes/KnowledgeBase";
import { ProductCatalog } from "@/components/modes/ProductCatalog";
import { CodebaseAssistant } from "@/components/modes/CodebaseAssistant";
import { NewsFeed } from "@/components/modes/NewsFeed";
import {
  FileText, Database, ShoppingBag, Code2, Newspaper,
  Brain, History, LogOut, User, HelpCircle, Info, Lock,
  Menu, X, ChevronLeft, ChevronRight, ChevronDown,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { llmSettings } from "@/lib/api";
import type { Mode } from "@/types";
import toast from "react-hot-toast";

// ── Mode metadata ─────────────────────────────────────────────────────────────

const MODES: {
  id: Mode;
  label: string;
  icon: React.ElementType;
  desc: string;
  example: string;
  tooltip: string;
}[] = [
  {
    id: "personal-docs",
    label: "Personal Docs",
    icon: FileText,
    desc: "Upload your PDFs, Word docs or text files. Ask questions and get answers from your own documents.",
    example: "What are the key findings in this report?",
    tooltip: "Ask anything about files you upload — works with PDFs, Word docs, and plain text files.",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    icon: Database,
    desc: "Build a searchable knowledge base from multiple documents. Perfect for company wikis and manuals.",
    example: "What is our refund policy?",
    tooltip: "Ingest many documents at once and search across all of them in a single question.",
  },
  {
    id: "product-catalog",
    label: "Product Catalog",
    icon: ShoppingBag,
    desc: "Upload your product CSV or JSON. Get AI-powered recommendations based on customer queries.",
    example: "Recommend a laptop under $1000 for gaming",
    tooltip: "Feed in your product list and let AI match the best items to any customer request.",
  },
  {
    id: "codebase",
    label: "Codebase",
    icon: Code2,
    desc: "Upload your code files and get intelligent answers about how your code works.",
    example: "How does the authentication system work?",
    tooltip: "Upload source code and ask questions in plain English — no grep or manual reading needed.",
  },
  {
    id: "news-feed",
    label: "News Feed",
    icon: Newspaper,
    desc: "Add RSS feeds and get AI summaries of the latest news on any topic you care about.",
    example: "Summarize today's AI news",
    tooltip: "Connect any RSS feed and get smart, topic-filtered summaries refreshed automatically.",
  },
];

// ── LLM provider definitions ──────────────────────────────────────────────────

type ProviderId = "groq" | "gemini" | "ollama";

const PROVIDERS: {
  id: ProviderId;
  label: string;
  badge: string;
  locked?: true;
  lockReason?: string;
}[] = [
  { id: "groq",   label: "Groq",   badge: "⚡ Fast"  },
  { id: "gemini", label: "Gemini", badge: "🧠 Smart" },
  {
    id: "ollama",
    label: "Ollama",
    badge: "🔒 Private",
    locked: true,
    lockReason: "Ollama requires local installation. Available for self-hosted deployments only.",
  },
];

// ── Page component ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeMode, setActiveMode] = useState<Mode>("personal-docs");
  const [provider, setProvider] = useState<ProviderId | "">("");
  const [switching, setSwitching] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modeVisible, setModeVisible] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    llmSettings.getProvider()
      .then((r) => setProvider(r.data.provider as ProviderId))
      .catch(() => {});
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close mobile sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const switchMode = (mode: Mode) => {
    if (mode === activeMode) {
      setMobileSidebarOpen(false);
      return;
    }
    setModeVisible(false);
    setTimeout(() => {
      setActiveMode(mode);
      setModeVisible(true);
      setMobileSidebarOpen(false);
    }, 150);
  };

  const switchProvider = async (p: ProviderId) => {
    if (p === provider || switching) return;
    setSwitching(true);
    try {
      await llmSettings.setProvider(p);
      setProvider(p);
      const name = PROVIDERS.find((x) => x.id === p)?.label ?? p;
      toast.success(`Switched to ${name}`);
    } catch {
      toast.error("Failed to switch provider");
    } finally {
      setSwitching(false);
    }
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    toast.success("Signed out");
    router.replace("/");
  };

  const ActiveComponent = {
    "personal-docs": PersonalDocs,
    "knowledge-base": KnowledgeBase,
    "product-catalog": ProductCatalog,
    "codebase": CodebaseAssistant,
    "news-feed": NewsFeed,
  }[activeMode];

  const activeInfo = MODES.find((m) => m.id === activeMode)!;
  const ollamaActive = provider === "ollama";

  // Sidebar nav items — shared between desktop and mobile drawer
  const renderModeItems = (collapsed: boolean) =>
    MODES.map(({ id, label, icon: Icon, desc, example, tooltip }) => (
      <button
        key={id}
        onClick={() => switchMode(id)}
        title={collapsed ? label : undefined}
        className={cn(
          "w-full text-left rounded-xl transition-all duration-200 relative group/item",
          collapsed ? "flex justify-center px-0 py-3" : "px-3 py-3",
          activeMode === id
            ? "bg-brand-600 text-white shadow-md shadow-brand-200/50"
            : "text-gray-700 hover:bg-gray-100"
        )}
      >
        {/* Left accent bar on active item */}
        {activeMode === id && !collapsed && (
          <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-white/50 rounded-r-full" />
        )}

        <div className={cn("flex items-start gap-2.5", collapsed && "justify-center")}>
          <Icon className={cn("h-4 w-4 shrink-0", !collapsed && "mt-1")} />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-sm font-medium leading-tight">{label}</p>
                <div className="relative group/tip">
                  <HelpCircle className={cn(
                    "h-3 w-3 cursor-help flex-shrink-0",
                    activeMode === id ? "text-brand-200" : "text-gray-300 hover:text-gray-500"
                  )} />
                  <div className="pointer-events-none absolute left-4 top-0 z-50 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl opacity-0 group-hover/tip:opacity-100 transition-opacity whitespace-normal">
                    {tooltip}
                  </div>
                </div>
              </div>
              <p className={cn(
                "text-xs leading-snug line-clamp-2",
                activeMode === id ? "text-brand-100" : "text-gray-500"
              )}>
                {desc}
              </p>
              <p className={cn(
                "text-xs mt-1 italic truncate",
                activeMode === id ? "text-brand-200" : "text-gray-400"
              )}>
                e.g. &ldquo;{example}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Tooltip for collapsed desktop mode */}
        {collapsed && (
          <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white shadow-xl opacity-0 group-hover/item:opacity-100 transition-opacity">
            {label}
          </div>
        )}
      </button>
    ));

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">

        {/* Left: hamburger (mobile) + brand + breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <Brain className="h-6 w-6 text-brand-600" />
            <BrandLogo />
            <span className="text-gray-300 text-lg font-thin hidden sm:block">|</span>
            <span className="text-xs text-gray-500 hidden sm:block">Dashboard</span>
          </div>

          {/* Breadcrumb (desktop) */}
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 ml-1">
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-600 font-medium">{activeInfo.label}</span>
          </div>
        </div>

        {/* Right: provider toggle + history + bell + user */}
        <div className="flex items-center gap-2">

          {/* LLM provider toggle */}
          <div className="relative">
            {provider ? (
              <div className="flex items-center p-1 bg-gray-100 rounded-xl gap-0.5">
                {PROVIDERS.map(({ id, label, badge, locked, lockReason }) =>
                  locked ? (
                    <div key={id} className="hidden sm:block relative group/lock">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs select-none cursor-not-allowed opacity-40">
                        <Lock className="h-3 w-3" />
                        <span>{label}</span>
                        <span>{badge}</span>
                      </div>
                      <div className="pointer-events-none absolute right-0 top-full mt-1.5 z-50 w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl opacity-0 group-hover/lock:opacity-100 transition-opacity whitespace-normal leading-relaxed">
                        {lockReason}
                      </div>
                    </div>
                  ) : (
                    <button
                      key={id}
                      onClick={() => switchProvider(id)}
                      disabled={switching}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:cursor-not-allowed select-none",
                        provider === id
                          ? "bg-white text-brand-700 shadow-sm font-semibold"
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden text-base leading-none" aria-hidden="true">{badge.split(" ")[0]}</span>
                      <span className={cn("text-xs hidden sm:block", provider === id ? "text-brand-500" : "text-gray-400")}>
                        {badge}
                      </span>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className="h-9 w-36 sm:w-48 rounded-xl bg-gray-100 animate-pulse" />
            )}
          </div>

          <div className="w-px h-5 bg-gray-200 hidden sm:block" />

          <Link
            href="/dashboard/history"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <History className="h-3.5 w-3.5" /> History
          </Link>


          {/* User avatar + dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs shrink-0">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                showUserMenu && "rotate-180"
              )} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Signed in as</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{user?.email}</p>
                </div>
                <Link
                  href="/dashboard/history"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <History className="h-4 w-4 text-gray-400" /> History
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Ollama notice */}
      {ollamaActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center gap-2 text-xs text-amber-700">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Ollama mode is active — make sure Ollama is installed and running at{" "}
            <code className="font-mono bg-amber-100 px-1 rounded">localhost:11434</code>.
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0">

        {/* ── Mobile sidebar overlay + drawer ─────────────────────────────── */}
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <div className="fixed inset-y-0 left-0 z-40 w-72 bg-white flex flex-col shadow-xl md:hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-brand-600" />
                  <BrandLogo />
                </div>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 py-3 px-3 space-y-1">
                {renderModeItems(false)}
              </nav>
            </div>
          </>
        )}

        {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
        <aside
          className={cn(
            "hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0 transition-all duration-300",
            sidebarCollapsed ? "w-[72px]" : "w-64"
          )}
          style={{ overflow: "visible" }}
        >
          <nav className="flex-1 py-4 px-3 space-y-1" style={{ overflow: "visible" }}>
            {renderModeItems(sidebarCollapsed)}
          </nav>

          {/* Collapse toggle */}
          <div className="px-3 py-3 border-t border-gray-100 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full flex items-center p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors",
                sidebarCollapsed ? "justify-center" : "gap-2"
              )}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed
                ? <ChevronRight className="h-4 w-4" />
                : <><ChevronLeft className="h-4 w-4" /><span className="text-xs">Collapse</span></>
              }
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <activeInfo.icon className="h-5 w-5 md:h-6 md:w-6 text-brand-600" />
                {activeInfo.label}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{activeInfo.desc}</p>
              <p className="text-gray-400 text-xs mt-0.5 italic">e.g. &ldquo;{activeInfo.example}&rdquo;</p>
            </div>

            {/* Mode content with fade transition */}
            <div className={cn(
              "transition-all duration-150",
              modeVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}>
              <ActiveComponent />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
