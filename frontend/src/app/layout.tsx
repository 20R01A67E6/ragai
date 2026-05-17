import type { Metadata, Viewport } from "next";
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
  alternates: {
    canonical: "https://ragaii.vercel.app",
  },
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

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "RAGaii",
  url: "https://ragaii.vercel.app",
  description:
    "AI-powered RAG platform that lets you upload documents, codebases, product catalogs, and news feeds — then ask questions in plain English.",
  applicationCategory: "AIApplication",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
