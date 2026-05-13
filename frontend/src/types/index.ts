export interface SourceDocument {
  id: string;
  text: string;
  metadata: Record<string, string>;
  score: number;
}

export interface QueryResponse {
  answer: string;
  sources: SourceDocument[];
  query: string;
  mode: string;
  llm_provider: string;
  llm_model: string;
  latency_ms: number;
  fallback_notice?: string;
}

export interface DocumentInfo {
  id: number;
  filename: string;
  original_name: string;
  file_url?: string;
  mode: string;
  namespace: string;
  file_type: string;
  chunk_count: number;
  status: string;
  created_at: string;
}

export interface QueryLogResponse {
  id: number;
  mode: string;
  namespace: string;
  query: string;
  answer: string;
  sources_count: number;
  llm_provider: string;
  llm_model: string;
  latency_ms: number;
  created_at: string;
}

export interface ProductResult {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, string>;
  score: number;
}

export interface ProductQueryResponse {
  recommendation: string;
  products: ProductResult[];
  query: string;
  llm_provider: string;
  llm_model: string;
  fallback_notice?: string;
}

export interface RssFeed {
  id: number;
  url: string;
  name: string;
  is_active: boolean;
  last_fetched: string | null;
  article_count: number;
  created_at: string;
}

export interface NewsSummaryResponse {
  summary: string;
  articles_used: number;
  topic: string | null;
  llm_provider: string;
  llm_model: string;
  fallback_notice?: string;
}

export type Mode =
  | "personal-docs"
  | "knowledge-base"
  | "product-catalog"
  | "codebase"
  | "news-feed";
