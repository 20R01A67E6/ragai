"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { AnswerCard } from "@/components/ui/AnswerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { codebase } from "@/lib/api";
import type { DocumentInfo, QueryResponse } from "@/types";
import { Code2, FileCode, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const CODE_ACCEPT = {
  "text/plain": [".py", ".js", ".ts", ".java", ".go", ".rs", ".cpp", ".c", ".cs", ".rb", ".sh"],
};

const EMPTY_STEPS = [
  "Upload your source code files — Python, JavaScript, TypeScript, Java, Go, and more.",
  "We'll analyze and index the code so every function and module is searchable.",
  "Ask any question about your code in plain English — no grep or manual searching needed.",
];

const EMPTY_EXAMPLES = [
  "How does the authentication system work?",
  "Explain the main function",
  "Where is the database connection set up?",
];

const MAX_CHARS = 500;

// Language detection from file extension
const LANG_META: Record<string, { label: string; bg: string; text: string }> = {
  py:   { label: "Python",     bg: "bg-blue-950",   text: "text-blue-300" },
  js:   { label: "JavaScript", bg: "bg-yellow-950",  text: "text-yellow-300" },
  ts:   { label: "TypeScript", bg: "bg-blue-900",    text: "text-blue-200" },
  java: { label: "Java",       bg: "bg-orange-950",  text: "text-orange-300" },
  go:   { label: "Go",         bg: "bg-cyan-950",    text: "text-cyan-300" },
  rs:   { label: "Rust",       bg: "bg-orange-900",  text: "text-orange-200" },
  cpp:  { label: "C++",        bg: "bg-gray-800",    text: "text-gray-200" },
  c:    { label: "C",          bg: "bg-gray-800",    text: "text-gray-200" },
  cs:   { label: "C#",         bg: "bg-purple-950",  text: "text-purple-300" },
  rb:   { label: "Ruby",       bg: "bg-red-950",     text: "text-red-300" },
  sh:   { label: "Shell",      bg: "bg-green-950",   text: "text-green-300" },
};

function getLang(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_META[ext] || { label: "Code", bg: "bg-gray-900", text: "text-gray-300" };
}

export function CodebaseAssistant() {
  const [files, setFiles] = useState<DocumentInfo[]>([]);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [query, setQuery] = useState("");
  const [namespace] = useState("default");
  const [loading, setLoading] = useState(false);

  const handleUpload = async (uploaded: File[]) => {
    for (const file of uploaded) {
      try {
        const res = await codebase.upload(file, namespace);
        setFiles((f) => [res.data, ...f]);
        toast.success(`Indexed ${file.name}`);
      } catch (e: any) {
        toast.error(`Failed: ${file.name} — ${e.response?.data?.detail || "error"}`);
      }
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || loading || charCount > MAX_CHARS) return;
    setLoading(true);
    try {
      const res = await codebase.query(query, namespace);
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
        accept={CODE_ACCEPT}
        multiple
        label="Upload source code files (.py, .js, .ts, .java, .go, .rs…)"
      />

      {files.length === 0 ? (
        <EmptyState
          icon={Code2}
          heading="Get started with Codebase Assistant"
          steps={EMPTY_STEPS}
          examples={EMPTY_EXAMPLES}
          onExampleClick={(ex) => setQuery(ex)}
        />
      ) : (
        <>
          {/* Indexed file chips with language badges */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Code2 className="h-4 w-4" />
              Indexed Files <span className="text-gray-400 font-normal">({files.length})</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {files.map((f) => {
                const lang = getLang(f.original_name);
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-mono",
                      lang.bg, lang.text,
                      "hover:opacity-90 transition-opacity"
                    )}
                  >
                    <FileCode className="h-3.5 w-3.5 shrink-0" />
                    <span>{f.original_name}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-sans font-semibold opacity-75",
                      "bg-white/10"
                    )}>
                      {lang.label}
                    </span>
                    <span className="opacity-50">· {f.chunk_count}c</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Query input */}
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow min-h-[44px]"
                placeholder="e.g. 'How does authentication work?' or 'Explain the main function'"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleQuery(); }}
              />
              <button
                onClick={handleQuery}
                disabled={loading || !query.trim() || isOverLimit}
                className={cn(
                  "flex items-center gap-1.5 px-4 sm:px-5 min-h-[44px] shrink-0 text-sm font-mono rounded-lg transition-all duration-200",
                  query.trim() && !loading && !isOverLimit
                    ? "bg-gray-900 text-green-400 hover:bg-gray-800 shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "…" : "$ ask"}
              </button>
            </div>
            <div className="flex justify-end">
              <span className={cn("text-xs tabular-nums", isOverLimit ? "text-red-500 font-medium" : "text-gray-400")}>
                {charCount}/{MAX_CHARS}
              </span>
            </div>
          </div>

          <AnswerCard response={response} loading={loading} />
        </>
      )}
    </div>
  );
}
