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
  AlertCircle,
  Building2,
  Loader2,
  LogIn,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";

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

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (redirectUrl) {
        router.replace(redirectUrl);
      } else if (user?.organizationId) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/onboarding");
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

      // Smart routing: if coming from invite link (/auth/join/[token]), return there!
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (!user.organizationId) {
        router.push("/auth/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, t, "auth.errorAuthFailed"));
    } finally {
      setLoading(false);
    }
  };

  const loginHref = redirectUrl
    ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/login";

  return (
    <div className="space-y-6">
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
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="register-name"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <UserIcon className="h-3.5 w-3.5 text-slate-400" />{" "}
            {t("auth.fullNameLabel")}
          </label>
          <Input
            id="register-name"
            type="text"
            placeholder={t("auth.fullNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
            required
          />
        </div>

        <div>
          <label
            htmlFor="register-email"
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5 text-slate-400" />{" "}
            {t("auth.emailLabel")}
          </label>
          <Input
            id="register-email"
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
            <label
              htmlFor="register-password"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-slate-400" />{" "}
              {t("auth.passwordLabel")}
            </label>
            <span className="text-[11px] text-slate-400">
              {t("auth.minPasswordLength")}
            </span>
          </div>
          <div className="relative mt-1">
            <Input
              id="register-password"
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
      <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <span>{t("auth.hasAccount")}</span>
        <Link
          href={loginHref}
          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>{t("auth.loginLink")}</span>
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
