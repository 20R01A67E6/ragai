"use client";
import { useState } from "react";
import Link from "next/link";
import { Brain, Eye, EyeOff, CheckCircle, Mail, RotateCcw } from "lucide-react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      setShowSuccess(true);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Verification email resent!");
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <Brain className="h-8 w-8 text-brand-600" />
            <BrandLogo className="text-2xl" />
          </Link>
          <p className="text-gray-500 text-sm mt-2">
            {showSuccess ? "Almost there!" : "Create your free account"}
          </p>
        </div>

        {showSuccess ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-fade-in text-center">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="bg-brand-50 rounded-full p-4">
                  <Mail className="h-10 w-10 text-brand-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-green-100 rounded-full p-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-3">Check your inbox</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              We&apos;ve sent a verification link to{" "}
              <span className="font-semibold text-gray-900">{email}</span>.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              Click the link in the email to activate your account and get started with RAGaii.
            </p>

            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs text-amber-700 leading-relaxed">
                Didn&apos;t receive it? Check your spam folder or wait a few minutes.
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-brand-200 text-brand-600 hover:bg-brand-50 disabled:opacity-60 font-semibold rounded-lg text-sm transition-colors mb-3"
            >
              <RotateCcw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Resending…" : "Resend email"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Min. 8 characters"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
