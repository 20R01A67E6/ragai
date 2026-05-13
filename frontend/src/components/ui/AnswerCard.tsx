"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, ChevronUp, Zap, AlertTriangle, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, formatLatency } from "@/lib/utils";
import type { QueryResponse, SourceDocument } from "@/types";

interface Props {
  response: QueryResponse | null;
  loading?: boolean;
}

function TypingDots() {
  return (
    <div className="rounded-xl border border-gray-200 p-5 bg-white">
      <div className="flex items-center gap-3">
        <Zap className="h-4 w-4 text-brand-400 animate-pulse shrink-0" />
        <span className="text-sm text-gray-500 font-medium">Thinking</span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceChip({ doc, index }: { doc: SourceDocument; index: number }) {
  const [open, setOpen] = useState(false);
  const matchPct = Math.round(doc.score * 100);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden text-sm transition-shadow hover:shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-medium text-gray-700 truncate">
            [{index + 1}] {doc.metadata?.source || "Source"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-1 w-12 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full"
                style={{ width: `${matchPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{matchPct}%</span>
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 ml-2 shrink-0" />
        }
      </button>
      {open && (
        <div className="px-3 py-2 bg-white text-gray-600 font-mono text-xs whitespace-pre-wrap border-t border-gray-100 leading-relaxed">
          {doc.text}
        </div>
      )}
    </div>
  );
}

export function AnswerCard({ response, loading }: Props) {
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (response) {
      setVisible(false);
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [response]);

  const copy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.answer).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <TypingDots />;
  if (!response) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      {response.fallback_notice && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="text-xs text-amber-700">{response.fallback_notice}</span>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 bg-brand-50 border-b border-brand-100">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-brand-600" />
          <span className="text-xs text-brand-700 font-medium">
            {response.llm_provider} · {response.llm_model} · {formatLatency(response.latency_ms)}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded-md hover:bg-brand-100"
          title="Copy answer"
        >
          {copied
            ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied!</>
            : <><Copy className="h-3.5 w-3.5" /> Copy</>
          }
        </button>
      </div>

      <div className="p-5 prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{response.answer}</ReactMarkdown>
      </div>

      {response.sources?.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-gray-500 hover:text-gray-800 font-medium flex items-center gap-1 transition-colors"
          >
            {showSources ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {response.sources.length} source{response.sources.length > 1 ? "s" : ""} used
          </button>
          {showSources && (
            <div className="space-y-2">
              {response.sources.map((s, i) => (
                <SourceChip key={s.id} doc={s} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
