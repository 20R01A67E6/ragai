import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/auth";

export const metadata: Metadata = {
  title: "RAGaii - Talk to Your Data. Get Real Answers.",
  description:
    "RAGaii is a free AI platform that lets you upload documents, codebases, product catalogs, and news feeds — then ask questions in plain English. Powered by Groq and Gemini.",
  keywords: [
    "RAG",
    "AI",
    "document search",
    "knowledge base",
    "codebase search",
    "product recommendations",
    "news summarizer",
    "retrieval augmented generation",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "RAGaii - Talk to Your Data. Get Real Answers.",
    description: "Upload your documents and ask questions. RAGaii finds answers instantly.",
    url: "https://ragaii.vercel.app",
    siteName: "RAGaii",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RAGaii - Talk to Your Data",
    description: "Free AI platform for documents, code, products and news.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
