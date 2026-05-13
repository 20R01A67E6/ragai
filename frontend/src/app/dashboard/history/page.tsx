"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { history } from "@/lib/api";
import {
  ArrowLeft, Trash2, FileText, MessageSquare, RefreshCw,
  Info, Search, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { formatDate, truncate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { DocumentInfo, QueryLogResponse } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = "queries" | "documents";

const MODE_LABELS: Record<string, string> = {
  personal_docs: "Personal Docs",
  knowledge_base: "Knowledge Base",
  product_catalog: "Product Catalog",
  codebase: "Codebase",
  news_feed: "News Feed",
};

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("queries");
  const [queries, setQueries] = useState<QueryLogResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuery, setExpandedQuery] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [q, d] = await Promise.all([history.queries(), history.documents()]);
      setQueries(q.data);
      setDocuments(d.data);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const deleteQuery = async (id: number) => {
    setDeletingId(id);
    try {
      await history.deleteQuery(id);
      setQueries((q) => q.filter((x) => x.id !== id));
      toast.success("Query deleted");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteDocument = async (id: number) => {
    setDeletingId(id);
    try {
      await history.deleteDocument(id);
      setDocuments((d) => d.filter((x) => x.id !== id));
      toast.success("Document deleted");
    } finally {
      setDeletingId(null);
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear all query history?")) return;
    await history.clearAll();
    setQueries([]);
    toast.success("History cleared");
  };

  // Filter queries by search term
  const filteredQueries = queries.filter((q) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      q.query.toLowerCase().includes(s) ||
      q.answer.toLowerCase().includes(s) ||
      (MODE_LABELS[q.mode] || q.mode).toLowerCase().includes(s)
    );
  });

  const filteredDocuments = documents.filter((d) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      d.original_name.toLowerCase().includes(s) ||
      (MODE_LABELS[d.mode] || d.mode).toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-40">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <h1 className="font-bold text-gray-900 flex-1">History</h1>
        <button
          onClick={load}
          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Retention notice */}
        <div className="flex items-start gap-3 p-4 mb-6 bg-blue-50 border border-blue-100 rounded-xl">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 leading-relaxed">
            <span className="font-semibold">Files are automatically cleared on the 1st of each month</span> to keep the platform fast and free.{" "}
            Your query history is kept forever.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {(["queries", "documents"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
                tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-gray-500 hover:text-gray-800"
              )}
            >
              {t === "queries"
                ? `Queries (${filteredQueries.length}${search ? `/${queries.length}` : ""})`
                : `Documents (${filteredDocuments.length}${search ? `/${documents.length}` : ""})`
              }
            </button>
          ))}
        </div>

        {/* Search bar */}
        {!loading && (queries.length > 0 || documents.length > 0) && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              placeholder={tab === "queries" ? "Search queries and answers…" : "Search documents…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Queries tab ────────────────────────────────────────────────────── */}
        {!loading && tab === "queries" && (
          <div className="space-y-3">
            {filteredQueries.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{search ? `No queries match "${search}"` : "No queries yet. Start asking questions in the dashboard."}</p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-2 text-sm text-brand-600 hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            )}

            {filteredQueries.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={clearAll}
                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
            )}

            {filteredQueries.map((q, i) => (
              <div
                key={q.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div
                  className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedQuery(expandedQuery === q.id ? null : q.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-medium">
                        {MODE_LABELS[q.mode] || q.mode}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(q.created_at)}</span>
                      <span className="text-xs text-gray-400">{q.latency_ms.toFixed(0)}ms · {q.llm_model}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{q.query}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{truncate(q.answer, 120)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {expandedQuery === q.id
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteQuery(q.id); }}
                      disabled={deletingId === q.id}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedQuery === q.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Answer</p>
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.answer}</ReactMarkdown>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      {q.sources_count} source{q.sources_count !== 1 ? "s" : ""} used
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Documents tab ───────────────────────────────────────────────────── */}
        {!loading && tab === "documents" && (
          <div className="space-y-3">
            {filteredDocuments.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>{search ? `No documents match "${search}"` : "No documents uploaded yet."}</p>
                {search && (
                  <button onClick={() => setSearch("")} className="mt-2 text-sm text-brand-600 hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            )}

            {filteredDocuments.map((doc, i) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-gray-300 transition-all duration-200"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.original_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {MODE_LABELS[doc.mode] || doc.mode}
                      </span>
                      <span className="text-xs text-gray-400">{doc.chunk_count} chunks</span>
                      <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full font-medium",
                        doc.status === "ready" ? "bg-green-100 text-green-700" :
                        doc.status === "error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      )}>{doc.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    disabled={deletingId === doc.id}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
