import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | RAGaii",
  description:
    "Sign in to RAGaii to access your documents, knowledge bases, and AI-powered search.",
  alternates: {
    canonical: "https://ragaii.vercel.app/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
