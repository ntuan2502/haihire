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
  Eye,
  EyeOff,
  AlertCircle,
  Building2,
  UserCheck,
  Loader2,
  UserPlus,
} from "lucide-react";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  isDemoLoginEnabled,
} from "@/constants/auth.constants";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const showDemoLogin = isDemoLoginEnabled();

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
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-medium">
          {t("auth.alreadySignedIn")}
        </p>
      </div>
    );
  }

  const handleSuccessfulAuth = (organizationId?: string | null) => {
    if (redirectUrl) {
      router.push(redirectUrl);
    } else if (!organizationId) {
      router.push("/auth/onboarding");
    } else {
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("auth.errorEmailPasswordRequired"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const user = await login(email, password);
      handleSuccessfulAuth(user.organizationId);
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, t, "auth.errorAuthFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (
    account: (typeof DEMO_ACCOUNTS)[keyof typeof DEMO_ACCOUNTS],
  ) => {
    try {
      setDemoLoadingEmail(account.email);
      setError(null);
      setEmail(account.email);
      setPassword(DEMO_PASSWORD);
      const user = await login(account.email, DEMO_PASSWORD);
      handleSuccessfulAuth(user.organizationId);
    } catch (err: unknown) {
      console.error(err);
      setError(getApiErrorMessage(err, t, "auth.errorAuthFailed"));
      setDemoLoadingEmail(null);
    }
  };

  const registerHref = redirectUrl
    ? `/auth/register?redirect=${encodeURIComponent(redirectUrl)}`
    : "/auth/register";

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary mb-2">
          <Building2 className="h-3.5 w-3.5" /> {t("auth.recruiterSignIn")}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t("auth.loginTitle")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      {/* 1-Click Demo Accounts: Admin & Member */}
      {showDemoLogin && (
        <>
          <div className="space-y-2.5 pt-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("auth.quickLoginDev")}
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* 1. Admin Demo Account */}
              <button
                type="button"
                disabled={Boolean(demoLoadingEmail) || loading}
                onClick={() => handleQuickLogin(DEMO_ACCOUNTS.ADMIN)}
                className="w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between border-border bg-card hover:bg-accent/50 hover:border-primary/40 shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    AD
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {DEMO_ACCOUNTS.ADMIN.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {DEMO_ACCOUNTS.ADMIN.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {DEMO_ACCOUNTS.ADMIN.email} &bull;{" "}
                      {DEMO_ACCOUNTS.ADMIN.description}
                    </p>
                  </div>
                </div>
                {demoLoadingEmail === DEMO_ACCOUNTS.ADMIN.email ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <UserCheck className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>

              {/* 2. Member Demo Account */}
              <button
                type="button"
                disabled={Boolean(demoLoadingEmail) || loading}
                onClick={() => handleQuickLogin(DEMO_ACCOUNTS.MEMBER)}
                className="w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between border-border bg-card hover:bg-accent/50 hover:border-ring/50 shadow-2xs group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                    MB
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground">
                        {DEMO_ACCOUNTS.MEMBER.name}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary text-secondary-foreground border border-border">
                        {DEMO_ACCOUNTS.MEMBER.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {DEMO_ACCOUNTS.MEMBER.email} &bull;{" "}
                      {DEMO_ACCOUNTS.MEMBER.description}
                    </p>
                  </div>
                </div>
                {demoLoadingEmail === DEMO_ACCOUNTS.MEMBER.email ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <UserCheck className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                )}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative flex items-center py-1">
            <div className="grow border-t border-border" />
            <span className="shrink mx-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("auth.orEmail")}
            </span>
            <div className="grow border-t border-border" />
          </div>
        </>
      )}

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

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="text-xs font-semibold text-foreground flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />{" "}
            {t("auth.emailLabel")}
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-10 text-xs rounded-md bg-background"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />{" "}
              {t("auth.passwordLabel")}
            </label>
          </div>
          <div className="relative mt-1">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 h-10 text-xs rounded-md bg-background"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
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
          disabled={loading || Boolean(demoLoadingEmail)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("auth.signingIn")}</span>
            </>
          ) : (
            <span>{t("auth.signInButton")}</span>
          )}
        </Button>
      </form>

      {/* Register Link */}
      <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span>{t("auth.noAccount")}</span>
        <Link
          href={registerHref}
          prefetch={false}
          className="font-semibold text-primary hover:underline inline-flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>{t("auth.signUpLink")}</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
