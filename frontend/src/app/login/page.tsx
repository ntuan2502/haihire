"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  UserCheck,
  Loader2,
  UserPlus,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  // Inputs are completely empty by default (no sample values)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, block access to login page and redirect immediately
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else if (user?.organizationId) {
        router.replace("/dashboard");
      } else {
        router.replace("/onboarding/create-org");
      }
    }
  }, [isAuthenticated, user, authLoading, redirectUrl, router]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <p className="text-xs text-slate-500 font-medium">
          Already signed in. Redirecting to workspace...
        </p>
      </div>
    );
  }

  const handleSuccessfulAuth = (organizationId?: string | null) => {
    if (redirectUrl) {
      router.push(redirectUrl);
    } else if (!organizationId) {
      router.push("/onboarding/create-org");
    } else {
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
      handleSuccessfulAuth(user.organizationId);
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(
          res.response?.data?.message ||
            "Authentication failed. Please check your credentials.",
        );
      } else {
        setError("Unable to connect to the authentication service.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo: Directly logs in as Demo Recruiter immediately!
  const handleQuickLogin = async () => {
    try {
      setDemoLoading(true);
      setError(null);
      setEmail("demo@tun.io.vn");
      setPassword("password123");
      const user = await login("demo@tun.io.vn", "password123");
      handleSuccessfulAuth(user.organizationId);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to sign in with demo account.");
      setDemoLoading(false);
    }
  };

  const registerHref = redirectUrl
    ? `/register?redirect=${encodeURIComponent(redirectUrl)}`
    : "/register";

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Mobile Back Link & Header */}
      <div className="lg:hidden flex items-center justify-between pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" /> Public Job Board
        </Link>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
          ATS
        </span>
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
          <Building2 className="h-3.5 w-3.5" /> Recruiter Sign In
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sign in to Hiring Portal
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter your staff credentials to access the talent acquisition dashboard.
        </p>
      </div>

      {/* 1-Click Demo Recruiter: Logs in directly on click */}
      <div className="space-y-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          1-Click Demo Account:
        </p>
        <button
          type="button"
          disabled={demoLoading || loading}
          onClick={handleQuickLogin}
          className="w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 shadow-2xs group"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
              HR
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Demo Recruiter
              </p>
              <p className="text-[11px] text-slate-500">
                Click to sign in instantly with demo account
              </p>
            </div>
          </div>
          {demoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          ) : (
            <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center py-1">
        <div className="grow border-t border-slate-200 dark:border-slate-800" />
        <span className="shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or sign in with email
        </span>
        <div className="grow border-t border-slate-200 dark:border-slate-800" />
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form: Clean, no default sample values */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-400" /> Recruiter Email
          </label>
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" /> Password
            </label>
          </div>
          <div className="relative mt-1">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || demoLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <span>Sign In to Workspace</span>
          )}
        </Button>
      </form>

      {/* Register Link */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href={registerHref}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <UserPlus className="h-3 w-3" />
          <span>Create an account</span>
        </Link>
      </div>

      {/* Quick Return */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
        >
          &larr; Return to Public Careers & Job Openings
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Left Column: Recruiter Branding & Value Proposition */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border-r border-slate-800">
        {/* Background Glow Accents */}
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-300 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Public Job Board
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <span className="font-black text-xl tracking-tighter">A</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight">ATS</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  <Sparkles className="h-2.5 w-2.5" /> Recruiter Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Talent Acquisition & Hiring Operations
              </p>
            </div>
          </div>
        </div>

        {/* Center Feature Highlights */}
        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-indigo-300 border border-slate-700/80">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Recruiter & Hiring Team Portal
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            Streamline your hiring pipeline from application to offer.
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            Manage open positions, review candidate resumes stored securely on MinIO, and advance applicants through interactive drag-and-drop Kanban stages.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>Multi-tenant organization workspaces</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>Interactive Kanban pipeline & candidate screening</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>MinIO S3 object storage for candidate resumes</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
          ATS &bull; Internal Hiring Team Workspace &bull; Domain @tun.io.vn
        </div>
      </div>

      {/* Right Column: Recruiter Login Form wrapped in Suspense */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-blue-600" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
