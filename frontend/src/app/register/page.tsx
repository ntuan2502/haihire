"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Loader2,
  LogIn,
} from "lucide-react";
import { useI18n } from "@/i18n";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { register, isAuthenticated, user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, block access to register page and redirect immediately
  useEffect(() => {
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
          {t("auth.alreadySignedIn")}
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError(t("auth.errorRegisterRequired"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.errorPasswordMinLength"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await register(name, email, password);

      // Smart routing: if coming from invite link (/join/[token]), return there!
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (!user.organizationId) {
        router.push("/onboarding/create-org");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(
          res.response?.data?.message ||
            t("auth.errorAuthFailed"),
        );
      } else {
        setError(t("auth.errorNetwork"));
      }
    } finally {
      setLoading(false);
    }
  };

  const loginHref = redirectUrl
    ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
    : "/login";

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Mobile Back Link & Header */}
      <div className="lg:hidden flex items-center justify-between pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
          ATS
        </span>
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
          <Building2 className="h-3.5 w-3.5" /> {t("auth.recruiterSignUp")}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("auth.registerTitle")}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("auth.registerSubtitle")}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5 text-slate-400" /> {t("auth.fullNameLabel")}
          </label>
          <Input
            type="text"
            placeholder={t("auth.fullNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-slate-400" /> {t("auth.emailLabel")}
          </label>
          <Input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-slate-400" /> {t("auth.passwordLabel")}
            </label>
            <span className="text-[11px] text-slate-400">{t("auth.minPasswordLength")}</span>
          </div>
          <div className="relative mt-1">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
              required
              minLength={6}
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
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("auth.signingUp")}</span>
            </>
          ) : (
            <span>{t("auth.signUpButton")}</span>
          )}
        </Button>
      </form>

      {/* Login Link */}
      <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        {t("auth.hasAccount")}{" "}
        <Link
          href={loginHref}
          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <LogIn className="h-3 w-3" />
          <span>{t("auth.loginLink")}</span>
        </Link>
      </div>

      {/* Quick Return */}
      <div className="text-center pt-2">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
        >
          &larr; {t("auth.returnToJobs")}
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Left Column: Recruiter Branding */}
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
            <ArrowLeft className="h-4 w-4" /> {t("auth.returnToJobs")}
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
              <span className="font-black text-xl tracking-tighter">A</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight">ATS</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-300 border border-blue-500/30">
                  <Sparkles className="h-2.5 w-2.5" /> {t("auth.recruiterPortal")}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t("auth.tagline")}
              </p>
            </div>
          </div>
        </div>

        {/* Center Highlights */}
        <div className="relative z-10 space-y-6 my-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-indigo-300 border border-slate-700/80">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            {t("auth.teamPortal")}
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
            {t("auth.registerHeroTitle")}
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed">
            {t("auth.registerHeroDesc")}
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t("auth.featureOnboarding")}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t("auth.featureLifecycle")}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
              <span>{t("auth.featureInvites")}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
          {t("auth.footerNote")}
        </div>
      </div>

      {/* Right Column: Register Form wrapped in Suspense */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin text-blue-600" />}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
