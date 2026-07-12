"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { Send, Trash2, Copy, Check, Sparkles, Bot, User } from "lucide-react";
import { chat } from "@/lib/api";
import type { ChatMessageResponse } from "@/types";
import { cn, formatLatency } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  model?: string;
  latency?: number;
}

const STARTERS = [
  "Explain machine learning in simple terms",
  "Write a Python function to sort a list",
  "What are the best practices for REST APIs?",
];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to the latest message (and while the AI is typing).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    // Snapshot prior turns for context BEFORE adding the new user message.
    const historyPayload = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((m) => [...m, { role: "user", content, timestamp: Date.now() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await chat.message(content, historyPayload);
      const d = res.data as ChatMessageResponse;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: d.response,
          timestamp: Date.now(),
          model: d.model_used,
          latency: d.latency_ms,
        },
      ]);
      if (d.fallback_notice) toast(d.fallback_notice, { icon: "⚠️" });
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
  };

  const clearConversation = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[400px] rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Sparkles className="h-4 w-4 text-brand-500" />
          Conversation
        </div>
        <button
          onClick={clearConversation}
          disabled={isEmpty && !input}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors",
            isEmpty && !input
              ? "text-gray-300 cursor-not-allowed"
              : "text-gray-500 hover:text-red-500 hover:bg-red-50"
          )}
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {isEmpty && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-brand-500" />
            </div>
            <p className="text-gray-700 font-medium">Start a conversation. Ask me anything.</p>
            <p className="text-gray-400 text-sm mt-1">No files needed — just chat directly with the AI.</p>

            <div className="mt-6 flex flex-col gap-2 w-full max-w-md">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm text-gray-600 border border-gray-200 rounded-lg px-3.5 py-2.5 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-gray-500" />
                </div>
              )}

              <div className={cn("max-w-[78%] flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                    m.role === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  )}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-pre:bg-gray-800 prose-headings:mt-2">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{m.content}</span>
                  )}
                </div>

                {/* Meta row: timestamp, model/latency, copy */}
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[10px] text-gray-400 tabular-nums">{formatTime(m.timestamp)}</span>
                  {m.role === "assistant" && (
                    <>
                      {m.model && (
                        <span className="text-[10px] text-gray-400">
                          {m.model}
                          {typeof m.latency === "number" && ` · ${formatLatency(m.latency)}`}
                        </span>
                      )}
                      <button
                        onClick={() => copy(m.content, i)}
                        className="flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-gray-700 transition-colors"
                        title="Copy message"
                      >
                        {copiedIdx === i ? (
                          <><Check className="h-3 w-3 text-green-500" /> Copied</>
                        ) : (
                          <><Copy className="h-3 w-3" /> Copy</>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {m.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-brand-600" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-gray-500" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-2 py-2">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input pinned at bottom */}
      <div className="border-t border-gray-100 p-3 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the AI…  (Enter to send, Shift+Enter for newline)"
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow max-h-32 min-h-[44px]"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className={cn(
              "flex items-center justify-center gap-1.5 px-4 min-h-[44px] shrink-0 text-white text-sm font-medium rounded-xl transition-all duration-200",
              input.trim() && !loading
                ? "bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow-md"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
