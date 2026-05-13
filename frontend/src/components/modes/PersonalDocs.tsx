"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { personalDocs } from "@/lib/api";
import type { DocumentInfo, QueryResponse } from "@/types";
import { Trash2, FileText, CheckCircle2, Send } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const EMPTY_STEPS = [
  "Upload a PDF, Word doc, or text file using the dropzone above.",
  "Wait a moment while we read and index your document.",
  "Type any question below and get an answer pulled directly from your file.",
];

const EMPTY_EXAMPLES = [
  "What are the key findings in this report?",
  "Summarize the main points",
  "What does section 3 cover?",
];

const MAX_CHARS = 500;

export function PersonalDocs() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [namespace] = useState("default");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newDocIds, setNewDocIds] = useState<Set<number>>(new Set());

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 18, 85));
    }, 300);

    try {
      for (const file of files) {
        const res = await personalDocs.upload(file, namespace);
        const doc = res.data as DocumentInfo;
        setDocs((d) => [doc, ...d]);
        setNewDocIds((s) => new Set([...s, doc.id]));
        setTimeout(() => {
          setNewDocIds((s) => { const n = new Set(s); n.delete(doc.id); return n; });
        }, 2500);
        toast.success(`Uploaded ${file.name}`);
      }
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 600);
    } catch (e: any) {
      clearInterval(interval);
      setUploadProgress(0);
      toast.error(e.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || loading || charCount > MAX_CHARS) return;
    setLoading(true);
    try {
      const res = await personalDocs.query(query, namespace);
      setResponse(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await personalDocs.delete(id);
    setDocs((d) => d.filter((doc) => doc.id !== id));
    toast.success("Document deleted");
  };

  const charCount = query.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <FileDropzone onFiles={handleUpload} multiple label="Upload PDFs, DOCX, or TXT files" />

      {/* Upload progress bar */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">Processing document…</span>
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

      {docs.length === 0 && !uploading ? (
        <EmptyState
          icon={FileText}
          heading="Get started with Personal Docs"
          steps={EMPTY_STEPS}
          examples={EMPTY_EXAMPLES}
          onExampleClick={(ex) => setQuery(ex)}
        />
      ) : (
        docs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Indexed Documents <span className="text-gray-400 font-normal">({docs.length})</span>
            </h3>
            {docs.map((doc) => (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all duration-500",
                  newDocIds.has(doc.id)
                    ? "border-green-300 bg-green-50 shadow-sm"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.original_name}</p>
                    <p className="text-xs text-gray-500">{doc.chunk_count} chunks · {formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {newDocIds.has(doc.id) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 animate-[bounce_0.5s_ease-in-out_2]" />
                  ) : (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      doc.status === "ready" ? "bg-green-100 text-green-700" :
                      doc.status === "error" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    )}>{doc.status}</span>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {docs.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
              placeholder="Ask a question about your documents… (Enter to submit)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleQuery(); }}
            />
            <button
              onClick={handleQuery}
              disabled={loading || !query.trim() || isOverLimit}
              className={cn(
                "flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-all duration-200",
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
      )}
    </div>
  );
}
