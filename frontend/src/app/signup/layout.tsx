import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started Free | RAGaii",
  description:
    "Create your free RAGaii account. No credit card required. Upload documents and get AI-powered answers in minutes.",
  alternates: {
    canonical: "https://ragaii.vercel.app/signup",
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
