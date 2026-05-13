"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { newsFeed } from "@/lib/api";
import type { RssFeed, NewsSummaryResponse } from "@/types";
import { Plus, Rss, RefreshCw, Trash2, Newspaper, AlertTriangle, Send } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDate, cn } from "@/lib/utils";

const EMPTY_STEPS = [
  "Find an RSS feed URL from any news site you follow (most sites have one).",
  "Enter a friendly name and paste the RSS URL above, then click Add.",
  "Ask for a news summary on any topic — we'll pull from all your feeds.",
];

const EMPTY_EXAMPLES = [
  "Summarize today's AI news",
  "What happened in tech this week?",
  "Give me a summary of climate news",
];

const CATEGORY_PILLS = ["AI", "Tech", "Finance", "Climate", "Health", "Politics", "Science", "Sports"];

export function NewsFeed() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [feedsLoaded, setFeedsLoaded] = useState(false);
  const [summary, setSummary] = useState<NewsSummaryResponse | null>(null);
  const [topic, setTopic] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadFeeds(); }, []);

  const loadFeeds = async () => {
    try {
      const res = await newsFeed.listFeeds();
      setFeeds(res.data);
    } catch {}
    finally {
      setFeedsLoaded(true);
    }
  };

  const addFeed = async () => {
    if (!feedUrl || !feedName) return;
    try {
      await newsFeed.addFeed(feedUrl, feedName);
      toast.success("Feed added and indexing in background…");
      setFeedUrl(""); setFeedName("");
      loadFeeds();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add feed");
    }
  };

  const deleteFeed = async (id: number) => {
    await newsFeed.deleteFeed(id);
    setFeeds((f) => f.filter((feed) => feed.id !== id));
    toast.success("Feed removed");
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await newsFeed.refresh();
      toast.success("Refreshing all feeds in background…");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const summarize = async () => {
    setLoading(true);
    try {
      const res = await newsFeed.summarize(topic || undefined);
      setSummary(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Summarization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add feed */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add RSS Feed
        </h3>
        <div className="flex gap-2 flex-col sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            placeholder="Feed name (e.g. BBC News)"
            value={feedName}
            onChange={(e) => setFeedName(e.target.value)}
          />
          <input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            placeholder="RSS URL"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFeed(); }}
          />
          <button
            onClick={addFeed}
            disabled={!feedUrl || !feedName}
            className="px-4 py-2 min-h-[44px] shrink-0 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400">Tip: search &ldquo;[site name] RSS feed&rdquo; to find the URL for any news source.</p>
      </div>

      {/* Feed list or empty state */}
      {feedsLoaded && feeds.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          heading="Get started with News Feed"
          steps={EMPTY_STEPS}
          examples={EMPTY_EXAMPLES}
          onExampleClick={(ex) => setTopic(ex)}
        />
      ) : feeds.length > 0 ? (
        <>
          {/* Active feeds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Rss className="h-4 w-4" /> Active Feeds
                <span className="text-xs text-gray-400 font-normal">({feeds.length})</span>
              </h3>
              <button
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-2 min-h-[44px] rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
                Refresh All
              </button>
            </div>

            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-white rounded-lg border border-gray-200 group-hover:border-brand-200 transition-colors shrink-0">
                    <Rss className="h-3.5 w-3.5 text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{feed.name}</p>
                    <p className="text-xs text-gray-500">
                      {feed.article_count} articles · Last: {feed.last_fetched ? formatDate(feed.last_fetched) : "never"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteFeed(feed.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Summarize section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Newspaper className="h-4 w-4" /> Summarize News
            </h3>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PILLS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setTopic(topic === cat ? "" : cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all duration-150",
                    topic === cat
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow min-h-[44px]"
                placeholder="Topic filter (optional) — e.g. 'AI', 'climate', 'finance'"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") summarize(); }}
              />
              <button
                onClick={summarize}
                disabled={loading}
                className={cn(
                  "flex items-center gap-1.5 px-4 sm:px-5 min-h-[44px] shrink-0 text-white text-sm font-medium rounded-lg transition-all duration-200",
                  !loading
                    ? "bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow-md"
                    : "bg-brand-400 cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
                {loading ? "Summarizing…" : "Summarize"}
              </button>
            </div>
          </div>

          {/* Summary result */}
          {summary && summary.fallback_notice && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="text-xs text-amber-700">{summary.fallback_notice}</span>
            </div>
          )}

          {summary && (
            <div className="rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  {summary.topic ? `News: ${summary.topic}` : "Latest News Summary"}
                </h3>
                <span className="text-xs text-gray-400">{summary.articles_used} articles · {summary.llm_model}</span>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summary}</ReactMarkdown>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
