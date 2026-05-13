"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { knowledgeBase } from "@/lib/api";
import type { QueryResponse } from "@/types";
import { Database, RefreshCw, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_STEPS = [
  "Give your knowledge base a name in the Namespace field above (e.g. \"company-wiki\").",
  "Upload multiple documents at once — policies, manuals, wikis, anything.",
  "Ask a question and get answers pulled across all your documents in one shot.",
];

const EMPTY_EXAMPLES = [
  "What is our refund policy?",
  "How do I reset my password?",
  "Explain the onboarding process",
];

const MAX_CHARS = 500;

export function KnowledgeBase() {
  const [stats, setStats] = useState<{ document_count: number; collection_name: string } | null>(null);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [namespace, setNamespace] = useState("default");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasIngested, setHasIngested] = useState(false);

  const refreshStats = async () => {
    try {
      const res = await knowledgeBase.stats(namespace);
      setStats(res.data);
    } catch {}
  };

  const handleIngest = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 18, 85));
    }, 300);

    try {
      await knowledgeBase.ingest(files, namespace);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 600);
      toast.success(`Ingesting ${files.length} file(s) in background…`);
      setHasIngested(true);
      setTimeout(refreshStats, 2000);
    } catch (e: any) {
      clearInterval(interval);
      setUploadProgress(0);
      toast.error(e.response?.data?.detail || "Ingestion failed");
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || loading || charCount > MAX_CHARS) return;
    setLoading(true);
    try {
      const res = await knowledgeBase.query(query, namespace);
      setResponse(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset the entire knowledge base?")) return;
    await knowledgeBase.reset(namespace);
    setStats(null);
    setHasIngested(false);
    toast.success("Knowledge base reset");
  };

  const charCount = query.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
          placeholder="Namespace (e.g. 'company-wiki')"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
        />
        <button
          onClick={refreshStats}
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
          title="Refresh stats"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
        <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-700 hover:underline transition-colors min-h-[44px] px-2">
          Reset
        </button>
      </div>

      {/* Stats badge */}
      {stats && (
        <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-brand-100">
          <div className="p-2 bg-brand-100 rounded-lg">
            <Database className="h-4 w-4 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-800">
              {stats.document_count.toLocaleString()} chunks indexed
            </p>
            <p className="text-xs text-brand-600">Collection: <code className="font-mono">{stats.collection_name}</code></p>
          </div>
        </div>
      )}

      <FileDropzone onFiles={handleIngest} multiple label="Bulk ingest documents into knowledge base" />

      {/* Upload progress bar */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">Queuing ingestion…</span>
            <span className="tabular-nums">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {!hasIngested && !uploading ? (
        <EmptyState
          icon={Database}
          heading="Get started with Knowledge Base"
          steps={EMPTY_STEPS}
          examples={EMPTY_EXAMPLES}
          onExampleClick={(ex) => setQuery(ex)}
        />
      ) : (
        hasIngested && (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow min-h-[44px]"
                placeholder="Ask anything about the knowledge base… (Enter to submit)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleQuery(); }}
              />
              <button
                onClick={handleQuery}
                disabled={loading || !query.trim() || isOverLimit}
                className={cn(
                  "flex items-center gap-1.5 px-4 sm:px-5 min-h-[44px] shrink-0 text-white text-sm font-medium rounded-lg transition-all duration-200",
                  query.trim() && !loading && !isOverLimit
                    ? "bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow-md"
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Thinking…" : "Ask"}
              </button>
            </div>
            <div className="flex justify-end">
              <span className={cn("text-xs tabular-nums", isOverLimit ? "text-red-500 font-medium" : "text-gray-400")}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
            <AnswerCard response={response} loading={loading} />
          </div>
        )
      )}
    </div>
  );
}
