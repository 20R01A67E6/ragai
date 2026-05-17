import axios from "axios";
import { supabase } from "./supabase";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: `${BASE}/api` });

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ── Personal Docs ─────────────────────────────────────────────────────────────
export const personalDocs = {
  upload: (file: File, namespace = "default") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("namespace", namespace);
    return api.post("/personal-docs/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  query: (query: string, namespace = "default", top_k = 5, llm_provider?: string, openrouter_model?: string) =>
    api.post("/personal-docs/query", { query, namespace, top_k, llm_provider, openrouter_model }),
  list: (namespace = "default") =>
    api.get("/personal-docs/documents", { params: { namespace } }),
  delete: (id: number) => api.delete(`/personal-docs/documents/${id}`),
};

// ── Knowledge Base ────────────────────────────────────────────────────────────
export const knowledgeBase = {
  ingest: (files: File[], namespace = "default") => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    fd.append("namespace", namespace);
    return api.post("/knowledge-base/ingest", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  query: (query: string, namespace = "default", top_k = 5, llm_provider?: string, openrouter_model?: string) =>
    api.post("/knowledge-base/query", { query, namespace, top_k, llm_provider, openrouter_model }),
  stats: (namespace = "default") =>
    api.get("/knowledge-base/stats", { params: { namespace } }),
  reset: (namespace = "default") =>
    api.delete("/knowledge-base/reset", { params: { namespace } }),
};

// ── Product Catalog ───────────────────────────────────────────────────────────
export const catalog = {
  upload: (file: File, namespace = "default") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("namespace", namespace);
    return api.post("/product-catalog/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  recommend: (query: string, namespace = "default", top_k = 5, llm_provider?: string, openrouter_model?: string) =>
    api.post("/product-catalog/recommend", { query, namespace, top_k, llm_provider, openrouter_model }),
};

// ── Codebase ─────────────────────────────────────────────────────────────────
export const codebase = {
  upload: (file: File, namespace = "default") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("namespace", namespace);
    return api.post("/codebase/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  query: (query: string, namespace = "default", top_k = 5, llm_provider?: string, openrouter_model?: string) =>
    api.post("/codebase/query", { query, namespace, top_k, llm_provider, openrouter_model }),
  list: (namespace = "default") =>
    api.get("/codebase/documents", { params: { namespace } }),
};

// ── News Feed ─────────────────────────────────────────────────────────────────
export const newsFeed = {
  addFeed: (url: string, name: string) => api.post("/news-feed/feeds", { url, name }),
  listFeeds: () => api.get("/news-feed/feeds"),
  deleteFeed: (id: number) => api.delete(`/news-feed/feeds/${id}`),
  refresh: (namespace = "default") =>
    api.post("/news-feed/refresh", null, { params: { namespace } }),
  summarize: (topic?: string, namespace = "default", top_k = 10, llm_provider?: string, openrouter_model?: string) =>
    api.post("/news-feed/summarize", { topic, namespace, top_k, llm_provider, openrouter_model }),
};

// ── History ───────────────────────────────────────────────────────────────────
export const history = {
  queries: (limit = 50) => api.get("/history/queries", { params: { limit } }),
  deleteQuery: (id: number) => api.delete(`/history/queries/${id}`),
  documents: () => api.get("/history/documents"),
  deleteDocument: (id: number) => api.delete(`/history/documents/${id}`),
  clearAll: () => api.delete("/history/all"),
};

// ── LLM Settings ─────────────────────────────────────────────────────────────
export const llmSettings = {
  getProvider: () => api.get<{ provider: string }>("/settings/llm-provider"),
  setProvider: (provider: string) =>
    api.post<{ provider: string }>("/settings/llm-provider", { provider }),
  getOpenRouterModels: () =>
    api.get<{ id: string; model_id: string }[]>("/settings/openrouter-models"),
  getOpenRouterModel: () =>
    api.get<{ model: string; model_key: string }>("/settings/openrouter-model"),
  setOpenRouterModel: (model: string) =>
    api.post<{ model: string; model_key: string }>("/settings/openrouter-model", { model }),
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthCheck = () => api.get("/health");
