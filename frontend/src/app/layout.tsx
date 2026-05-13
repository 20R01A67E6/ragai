import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/auth";

export const metadata: Metadata = {
  title: "RAGaii — Retrieval-Augmented Generation Platform",
  description: "Multi-mode AI platform: Q&A over docs, knowledge bases, product catalogs, code, and news.",
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
