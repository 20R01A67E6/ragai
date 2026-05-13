"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "verifying" | "success" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 2000);
      } else if (event === "USER_UPDATED") {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 2000);
      }
    });

    // Also check the current session immediately in case the event
    // already fired before this listener was registered.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
      } else if (session) {
        setStatus("success");
        setTimeout(() => router.replace("/dashboard"), 2000);
      }
      // If no session yet, keep "verifying" — the onAuthStateChange above
      // will fire once Supabase finishes processing the token from the URL.
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <Brain className="h-8 w-8 text-brand-600" />
            <span className="text-2xl font-bold text-gray-900">RAGaii</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          {status === "verifying" && (
            <>
              <div className="flex justify-center mb-5">
                <Loader2 className="h-12 w-12 text-brand-500 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying your email…</h2>
              <p className="text-sm text-gray-500">Just a moment while we confirm your account.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="bg-green-50 rounded-full p-4">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
              <p className="text-sm text-gray-500 mb-1">Taking you to RAGaii…</p>
              <div className="mt-4 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 rounded-full animate-progress" />
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-5">
                <div className="bg-red-50 rounded-full p-4">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                {errorMessage || "The verification link may have expired or already been used."}
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-sm transition-colors text-center"
                >
                  Try signing up again
                </Link>
                <Link
                  href="/login"
                  className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
