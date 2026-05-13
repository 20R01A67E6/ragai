"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { EmptyState } from "@/components/ui/EmptyState";
import { catalog } from "@/lib/api";
import type { ProductQueryResponse } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShoppingBag, Star, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const EMPTY_STEPS = [
  "Prepare your product data as a CSV or JSON file — one row or object per product.",
  "Upload it using the dropzone above — one file per catalog.",
  "Ask for a recommendation in plain English and get matched products instantly.",
];

const EMPTY_EXAMPLES = [
  "Recommend a laptop under $1000 for gaming",
  "Best wireless headphones under $200",
  "What's a good gift for a photographer?",
];

const MAX_CHARS = 500;

export function ProductCatalog() {
  const [response, setResponse] = useState<ProductQueryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [namespace] = useState("default");
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + Math.random() * 20, 85));
    }, 250);

    try {
      await catalog.upload(files[0], namespace);
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => { setUploadProgress(0); setUploaded(true); }, 500);
      toast.success("Catalog uploaded and indexed!");
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
      const res = await catalog.recommend(query, namespace);
      setResponse(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Query failed");
    } finally {
      setLoading(false);
    }
  };

  const charCount = query.length;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <div className="space-y-6">
      <FileDropzone
        onFiles={handleUpload}
        accept={{ "text/csv": [".csv"], "application/json": [".json"] }}
        label="Upload product catalog (CSV or JSON)"
      />

      {/* Upload progress bar */}
      {uploading && (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">Indexing catalog…</span>
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

      {uploaded ? (
        <>
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-sm text-green-800">
            <ShoppingBag className="h-4 w-4 shrink-0" />
            Catalog indexed! Ask for recommendations below.
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow min-h-[44px]"
                placeholder="e.g. 'best laptop under $1000 for video editing'"
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
                {loading ? "Finding…" : "Recommend"}
              </button>
            </div>
            <div className="flex justify-end">
              <span className={cn("text-xs tabular-nums", isOverLimit ? "text-red-500 font-medium" : "text-gray-400")}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          {response && (
            <div className="space-y-4">
              {response.fallback_notice && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="text-xs text-amber-700">{response.fallback_notice}</span>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">AI Recommendation</h3>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.recommendation}</ReactMarkdown>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {response.products.map((p) => {
                  const scorePct = Math.round(p.score * 100);
                  return (
                    <div
                      key={p.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-brand-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-50 transition-all duration-200 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-gray-800 leading-snug">{p.name}</h4>
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold shrink-0 ml-2">
                          <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                          {scorePct}%
                        </span>
                      </div>

                      {/* Match score bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${scorePct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">{scorePct}% match</p>
                      </div>

                      <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{p.description}</p>

                      <div className="flex flex-wrap gap-1 mt-auto">
                        {Object.entries(p.metadata)
                          .filter(([k]) => !["doc_id", "name"].includes(k))
                          .slice(0, 4)
                          .map(([k, v]) => (
                            <span key={k} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {k}: {v}
                            </span>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        !uploading && (
          <EmptyState
            icon={ShoppingBag}
            heading="Get started with Product Catalog"
            steps={EMPTY_STEPS}
            examples={EMPTY_EXAMPLES}
            onExampleClick={(ex) => setQuery(ex)}
          />
        )
      )}
    </div>
  );
}
