"use client";

import {
  useState,
  useEffect,
  Suspense,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { AuthGuard } from "@/components/shared/auth-guard";
import { api } from "@/lib/api";
import { useMyOrgs, useSwitchOrgMutation } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  Building2,
  Link2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Moon,
  Sun,
  Globe,
} from "lucide-react";
import { cn } from "cn";
import type { Organization } from "@/types";
import { useI18n } from "@/i18n";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUserOrg, loading: authLoading } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrgs();
  const switchOrgMutation = useSwitchOrgMutation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [displayHost, setDisplayHost] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setDisplayHost(window.location.host);
    }
  }, []);

  const isDark = mounted ? (resolvedTheme || theme) === "dark" : false;

  // Derive initial mode: "select" | "create" | "join"
  const urlMode = searchParams.get("mode");
  const [mode, setMode] = useState<"select" | "create" | "join">("select");

  useEffect(() => {
    if (urlMode === "create") {
      setMode("create");
    } else if (urlMode === "join") {
      setMode("join");
    } else if (!authLoading && !user?.organizationId && myOrgs.length === 0) {
      setMode("create");
    } else if (!authLoading && (user?.organizationId || myOrgs.length > 0)) {
      setMode("select");
    }
  }, [urlMode, user?.organizationId, myOrgs.length, authLoading]);

  // Create form state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Join form state (only invite link or code)
  const [inviteCodeOrSlug, setInviteCodeOrSlug] = useState("");

  // Status & error state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-generate slug from organization name
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOrgName(value);

    if (!isSlugManuallyEdited) {
      const generated = value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setSlug(generated);
    }
    setError(null);
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(
      e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-"),
    );
    setError(null);
  };

  // Handle Organization Selection from list
  const handleSelectOrg = async (org: Organization) => {
    if (org.id === user?.organizationId) {
      router.push("/dashboard");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await switchOrgMutation.mutateAsync(org.id);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Failed to switch workspace.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Organization
  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please enter your organization name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please enter a valid slug.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post<{ organization: Organization }>(
        "/organizations",
        {
          name: orgName.trim(),
          slug: slug.trim(),
        },
      );

      const createdOrg = res.data.organization;
      updateUserOrg(createdOrg);
      setSuccessMsg(`Workspace for "${createdOrg.name}" successfully created!`);

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(res.response?.data?.message || "Failed to create organization.");
      } else {
        setError("Error connecting to server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Join Organization via invite code or slug
  const handleJoinOrg = async (codeOrSlugToJoin?: string) => {
    const target = codeOrSlugToJoin || inviteCodeOrSlug;
    if (!target.trim()) {
      setError("Please provide an invite link, code, or organization slug.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await api.post<{ organization: Organization; message: string }>(
        "/organizations/join",
        {
          inviteCodeOrSlug: target.trim(),
        },
      );

      const joinedOrg = res.data.organization;
      updateUserOrg(joinedOrg);
      setSuccessMsg(`Successfully joined ${joinedOrg.name}!`);

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const res = err as { response?: { data?: { message?: string } } };
        setError(res.response?.data?.message || "Failed to join organization.");
      } else {
        setError("Error connecting to server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Compute the list of organizations the user can choose from
  const displayOrgs: Organization[] =
    myOrgs.length > 0
      ? myOrgs
      : user?.organization
      ? [user.organization]
      : [];

  const hasExistingOrgs = displayOrgs.length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
        {/* Left: Theme Switcher & Language */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Switch language"
          >
            <Globe className="h-3.5 w-3.5" />
            <span className="uppercase">{locale}</span>
          </button>
        </div>

        {/* Right: Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            ATS
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Alerts */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-start gap-2.5 shadow-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: SELECT AN ORGANIZATION (From User Screenshot)    */}
          {/* ======================================================== */}
          {mode === "select" ? (
            <div>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("onboarding.selectOrgTitle")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("onboarding.selectOrgSubtitle")}
                </p>
              </div>

              {/* Organization Cards List */}
              <div className="space-y-2.5">
                {orgsLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <p className="text-xs text-slate-400">{t("onboarding.loadingWorkspaces")}</p>
                  </div>
                ) : displayOrgs.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-500">{t("onboarding.noWorkspaces")}</p>
                  </div>
                ) : (
                  displayOrgs.map((org) => {
                    const isActive = org.id === user?.organizationId;
                    return (
                      <div
                        key={org.id}
                        onClick={() => handleSelectOrg(org)}
                        className={cn(
                          "w-full p-4 rounded-xl border bg-white dark:bg-slate-900 flex items-center justify-between cursor-pointer transition-all group",
                          isActive
                            ? "border-slate-300 dark:border-slate-700 shadow-xs ring-1 ring-blue-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40",
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 group-hover:scale-105 transition-transform">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {org.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {org.slug}
                            </p>
                          </div>
                        </div>

                        {isActive ? (
                          <span className="text-[11px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
                            {t("onboarding.activeBadge")}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                            {t("onboarding.openWorkspace")} <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Links Below (Matching screenshot exactly) */}
              <div className="mt-7 flex flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                >
                  {t("onboarding.createOrgLink")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("join");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                >
                  {t("onboarding.joinOrgLink")}
                </button>
              </div>
            </div>
          ) : mode === "create" ? (
            /* ======================================================== */
            /* VIEW 2: CREATE A NEW ORGANIZATION                        */
            /* ======================================================== */
            <div>
              {hasExistingOrgs && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("select");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("onboarding.backToSelect")}
                </button>
              )}

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("onboarding.createOrgTitle")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("onboarding.createOrgSubtitle")}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("onboarding.orgNameLabel")}
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder={t("onboarding.orgNamePlaceholder")}
                    value={orgName}
                    onChange={handleNameChange}
                    className="h-10 rounded-lg border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("onboarding.slugLabel")}
                  </label>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                    <span className="px-3 text-xs text-slate-400 font-mono select-none">
                      {displayHost ? `${displayHost}/` : "workspace/"}
                    </span>
                    <input
                      type="text"
                      required
                      placeholder={t("onboarding.slugPlaceholder")}
                      value={slug}
                      onChange={handleSlugChange}
                      className="h-10 flex-1 bg-white dark:bg-slate-950 px-3 text-sm font-mono border-l border-slate-200 dark:border-slate-800 outline-hidden"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {t("onboarding.slugHint")}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  {submitting ? t("onboarding.creatingOrg") : t("onboarding.createOrgButton")}
                </Button>
              </form>

              {/* Footer switch link */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("join");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {t("onboarding.joinOrgInstead")}
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 3: JOIN AN EXISTING ORGANIZATION                    */
            /* ======================================================== */
            <div>
              {hasExistingOrgs && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("select");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("onboarding.backToSelect")}
                </button>
              )}

              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t("onboarding.joinOrgTitle")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("onboarding.joinOrgSubtitle")}
                </p>
              </div>

              <div className="space-y-4">
                {/* Box: Have an invite link? */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-5 dark:border-slate-800/90 dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center gap-2 mb-3.5">
                    <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t("onboarding.inviteLinkBoxTitle")}
                    </span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinOrg();
                    }}
                    className="flex items-center gap-2.5"
                  >
                    <Input
                      type="text"
                      placeholder={t("onboarding.inviteLinkPlaceholder")}
                      value={inviteCodeOrSlug}
                      onChange={(e) => {
                        setInviteCodeOrSlug(e.target.value);
                        setError(null);
                      }}
                      className="h-10 rounded-lg border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-950"
                    />
                    <Button
                      type="submit"
                      disabled={submitting || !inviteCodeOrSlug.trim()}
                      className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm cursor-pointer shrink-0"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("onboarding.joinButton")}
                    </Button>
                  </form>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {t("onboarding.inviteLinkHint")}
                  </p>
                </div>
              </div>

              {/* Footer switch link */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors cursor-pointer"
                >
                  {t("onboarding.createOrgInstead")}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function OnboardingCreateOrgPage() {
  return (
    <AuthGuard requireOrg={false}>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        }
      >
        <OnboardingContent />
      </Suspense>
    </AuthGuard>
  );
}
