"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { organizationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Shield,
  User as UserIcon,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { GatewayNavbar } from "@/components/layout";
import { BRAND_CONFIG } from "@haihire/shared";

interface PublicInviteData {
  valid: boolean;
  token?: string;
  role?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  createdByName?: string;
  expiresAt?: string | null;
  message?: string;
}

export default function JoinOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, updateUserOrg } = useAuth();
  const { t } = useI18n();

  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : (rawToken as string);

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<PublicInviteData | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAlreadyMember = Boolean(
    isAuthenticated &&
      user &&
      inviteData?.organization?.id &&
      (user.organizationId === inviteData.organization.id ||
        user.organization?.id === inviteData.organization.id ||
        (user.organization?.slug &&
          inviteData.organization.slug &&
          user.organization.slug.toLowerCase() ===
            inviteData.organization.slug.toLowerCase())),
  );

  // Fetch invite link details
  useEffect(() => {
    async function loadInvite() {
      if (!token) return;
      try {
        setLoading(true);
        const res = await organizationsApi.getPublicInvite(token);
        setInviteData(res);
        if (!res.valid) {
          setError(res.message || t("auth.invalidInvitation"));
        }
      } catch (err: unknown) {
        console.error(err);
        setError("Failed to verify invitation link. Please check the URL.");
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token, t]);

  // Handle joining organization when logged in
  const handleJoin = async () => {
    if (!token) return;
    if (isAlreadyMember) {
      setError(t("join.alreadyMember", { org: inviteData?.organization?.name || "" }));
      return;
    }
    try {
      setJoining(true);
      setError(null);
      const res = await organizationsApi.joinByToken(token);
      if (res.organization) {
        updateUserOrg(res.organization);
      }
      setSuccessMsg(t("join.welcome", { org: res.organization?.name || "" }));
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Failed to join organization.")
          : "Failed to join organization.";
      setError(msg);
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col justify-between transition-colors">
      <GatewayNavbar />

      {/* Main Content Card Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {t("join.title")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("join.subtitle")}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-xs text-slate-400">{t("join.verifying")}</p>
            </div>
          )}

          {/* Error Message if invalid */}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-200/90 bg-white p-6 shadow-xs dark:border-rose-950 dark:bg-slate-900 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("join.unableToJoin")}
              </h3>
              <p className="text-xs text-rose-500 leading-relaxed">{error}</p>
              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(isAuthenticated ? "/dashboard" : "/login")}
                  className="text-xs font-semibold"
                >
                  {isAuthenticated ? t("join.goToDashboard") : t("common.back")}
                </Button>
              </div>
            </div>
          )}

          {/* Success message */}
          {successMsg && (
            <div className="rounded-2xl border border-emerald-200/90 bg-white p-6 shadow-xs dark:border-emerald-950 dark:bg-slate-900 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {successMsg}
              </h3>
              <p className="text-xs text-slate-400">{t("auth.alreadySignedIn")}</p>
            </div>
          )}

          {/* Valid Invite Card (Matches Image 3 & 4) */}
          {!loading && inviteData?.valid && !successMsg && (
            <div className="space-y-4">
              {/* Organization Preview Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {inviteData.organization?.name || "Organization"}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {inviteData.organization?.slug || "org"}
                    </p>
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("join.joinAs")} <strong>{inviteData.role || "Member"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span>{t("join.invitedBy")} <strong>{inviteData.createdByName || "Team"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Area: When NOT Logged In (Image 3) */}
              {!isAuthenticated ? (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("join.signInPrompt")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      onClick={() =>
                        router.push(`/login?redirect=/join/${token}`)
                      }
                      className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {t("join.signInButton")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        router.push(`/login?redirect=/join/${token}&mode=register`)
                      }
                      className="h-10 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {t("join.createAccountButton")}
                    </Button>
                  </div>
                </div>
              ) : isAlreadyMember ? (
                /* Action Area: When Already a Member */
                <div className="space-y-3 text-center">
                  <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      {t("join.alreadyMember", { org: inviteData.organization?.name || "" })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {t("join.goToDashboard")}
                  </Button>
                </div>
              ) : (
                /* Action Area: When LOGGED IN and Not Member Yet (Image 4) */
                <div>
                  <Button
                    type="button"
                    disabled={joining}
                    onClick={handleJoin}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t("join.joiningButton")}</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>{t("join.joinOrgButton", { org: inviteData.organization?.name || "" })}</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-400">
        © {new Date().getFullYear()} {BRAND_CONFIG.name}. {t("careers.allRightsReserved")}
      </footer>
    </div>
  );
}
