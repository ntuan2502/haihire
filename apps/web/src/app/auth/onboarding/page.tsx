"use client";

import {
  useState,
  useEffect,
  useMemo,
  Suspense,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { useMyOrgs, useSwitchOrgMutation } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import type { Organization } from "@/types";
import { useI18n } from "@/i18n";
import { getApiErrorMessage, type AppErrorSource } from "@/lib/api-error";
import { toast } from "@/lib/toast";
import { OnboardingSelectView } from "@/components/auth/onboarding/onboarding-select-view";
import { OnboardingCreateView } from "@/components/auth/onboarding/onboarding-create-view";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    isAuthenticated,
    updateUserOrg,
    loading: authLoading,
  } = useAuth();
  const { t } = useI18n();
  const { data: myOrgs = [], isLoading: orgsLoading } = useMyOrgs({
    enabled: isAuthenticated,
  });
  const switchOrgMutation = useSwitchOrgMutation();
  const [displayHost, setDisplayHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDisplayHost(window.location.host);
    }
  }, []);

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

  // Handle switching view mode and updating URL query string
  const handleSwitchMode = (newMode: "select" | "create" | "join") => {
    setMode(newMode);
    setErrorSource(null);

    const params = new URLSearchParams(searchParams.toString());
    if (newMode === "select") {
      params.delete("mode");
    } else {
      params.set("mode", newMode);
    }
    const query = params.toString();
    const newPath = query ? `/auth/onboarding?${query}` : "/auth/onboarding";
    router.push(newPath, { scroll: false });
  };

  // Create form state
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Join form state (only invite link or code)
  const [inviteCodeOrSlug, setInviteCodeOrSlug] = useState("");

  // Status & error state
  const [submitting, setSubmitting] = useState(false);
  const [errorSource, setErrorSource] = useState<AppErrorSource | null>(null);

  // Derived reactive error message: re-evaluates automatically whenever `t` (language) changes!
  const error = useMemo(() => {
    if (!errorSource) return null;
    return getApiErrorMessage(errorSource, t);
  }, [errorSource, t]);

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with -
      .replace(/[^\w-]+/g, "") // Remove all non-word chars
      .replace(/--+/g, "-"); // Replace multiple - with single -
  };

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    setErrorSource(null);
    if (!isSlugManuallyEdited) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
    setErrorSource(null);
  };

  const handleSelectOrg = async (org: Organization) => {
    if (org.id === user?.organizationId) {
      router.push("/dashboard");
      return;
    }

    try {
      await switchOrgMutation.mutateAsync(org.id);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error(err);
      setErrorSource(err);
    }
  };

  const handleCreateOrg = async (e: FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !slug.trim()) return;

    setSubmitting(true);
    setErrorSource(null);

    try {
      const res = await api.post<{ organization: Organization }>(
        "/organizations",
        {
          name: orgName.trim(),
          slug: slug.trim(),
        },
      );

      const newOrg = res.data.organization;
      updateUserOrg(newOrg);
      toast.success(`Organization ${newOrg.name} created!`);

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      setErrorSource(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinOrg = async () => {
    const target = inviteCodeOrSlug.trim();
    if (!target) return;

    setSubmitting(true);
    setErrorSource(null);

    try {
      const res = await api.post<{
        organization: Organization;
        message: string;
      }>("/organizations/join", {
        inviteCodeOrSlug: target.trim(),
      });

      const joinedOrg = res.data.organization;
      updateUserOrg(joinedOrg);
      toast.success(`Successfully joined ${joinedOrg.name}!`);

      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      console.error(err);
      setErrorSource(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute the list of organizations the user can choose from
  const displayOrgs: Organization[] =
    myOrgs.length > 0 ? myOrgs : user?.organization ? [user.organization] : [];

  const hasExistingOrgs = displayOrgs.length > 0;

  return (
    <div className="w-full">
      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW 1: SELECT AN ORGANIZATION */}
      {mode === "select" ? (
        <OnboardingSelectView
          orgsLoading={orgsLoading}
          displayOrgs={displayOrgs}
          activeOrgId={user?.organizationId}
          onSelectOrg={handleSelectOrg}
          onSwitchMode={handleSwitchMode}
        />
      ) : mode === "create" ? (
        /* VIEW 2: CREATE A NEW ORGANIZATION */
        <OnboardingCreateView
          hasExistingOrgs={hasExistingOrgs}
          onSwitchMode={handleSwitchMode}
          onSubmit={handleCreateOrg}
          orgName={orgName}
          onNameChange={handleNameChange}
          slug={slug}
          onSlugChange={handleSlugChange}
          displayHost={displayHost}
          submitting={submitting}
        />
      ) : (
        /* VIEW 3: JOIN AN EXISTING ORGANIZATION */
        <div>
          {hasExistingOrgs && (
            <button
              type="button"
              onClick={() => handleSwitchMode("select")}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("onboarding.backToSelect")}
            </button>
          )}

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("onboarding.joinOrgTitle")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("onboarding.joinOrgSubtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {/* Box: Have an invite link? */}
            <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-3.5">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
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
                    setErrorSource(null);
                  }}
                  className="h-10 rounded-md border-input bg-background text-sm"
                />
                <Button
                  type="submit"
                  disabled={submitting || !inviteCodeOrSlug.trim()}
                  className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm rounded-md shadow-xs cursor-pointer shrink-0"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("onboarding.joinButton")
                  )}
                </Button>
              </form>
              <p className="text-[11px] text-muted-foreground mt-2">
                {t("onboarding.inviteLinkHint")}
              </p>
            </div>
          </div>

          {/* Footer switch link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => handleSwitchMode("create")}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {t("onboarding.createOrgInstead")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
