"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { organizationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Shield,
  User as UserIcon,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useI18n, type TranslationKey } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel } from "@/lib/roles";
import { toast } from "@/lib/toast";
import type { PublicInvitePreview } from "@/types";

function getApiErrorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } })?.response?.data
    ?.code;
}

type JoinErrorState =
  | { type: "api"; error: unknown; fallbackKey?: TranslationKey }
  | { type: "already_member"; orgName: string }
  | null;

export default function JoinOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, updateUserOrg, logout } = useAuth();
  const { t } = useI18n();

  const rawToken = params?.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : (rawToken as string);

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<PublicInvitePreview | null>(
    null,
  );
  const [joining, setJoining] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [errorState, setErrorState] = useState<JoinErrorState>(null);

  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);
    const redirectTarget = `/auth/login?redirect=${encodeURIComponent(`/auth/join/${token}`)}`;
    if (logout) {
      await logout({ redirectTo: redirectTarget });
    } else {
      router.push(redirectTarget);
    }
  };

  const error =
    errorState?.type === "already_member"
      ? t("join.alreadyMember", { org: errorState.orgName })
      : errorState?.type === "api"
        ? getApiErrorMessage(errorState.error, t, errorState.fallbackKey)
        : null;

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
        setErrorState(null);
        const res = await organizationsApi.getPublicInvite(token);
        setInviteData(res);
        if (!res.valid) {
          setErrorState({
            type: "api",
            error: {
              response: { data: { code: res.code, message: res.message } },
            },
            fallbackKey: "auth.invalidInvitation",
          });
        }
      } catch (err: unknown) {
        console.error(err);
        setErrorState({
          type: "api",
          error: err,
          fallbackKey: "auth.invalidInvitation",
        });
      } finally {
        setLoading(false);
      }
    }
    loadInvite();
  }, [token]);

  // Handle joining organization when logged in
  const handleJoin = async () => {
    if (!token) return;
    if (isAlreadyMember) {
      setErrorState({
        type: "already_member",
        orgName: inviteData?.organization?.name || "",
      });
      return;
    }
    try {
      setJoining(true);
      setErrorState(null);
      const res = await organizationsApi.joinByToken(token);
      if (res.organization) {
        updateUserOrg(res.organization, res.role);
      }
      toast.success(t("join.welcome", { org: res.organization?.name || "" }));
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: unknown) {
      console.error(err);
      setErrorState({ type: "api", error: err });
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="text-center space-y-1">
        <h1 className="text-lg sm:text-xl font-bold text-foreground">
          {t("join.title")}
        </h1>
        <p className="text-xs text-muted-foreground">{t("join.subtitle")}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-xl border border-border bg-card text-card-foreground p-8 shadow-xs flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">{t("join.verifying")}</p>
        </div>
      )}

      {/* Error Message if invalid */}
      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-card text-card-foreground p-6 shadow-xs text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-foreground">
            {t("join.unableToJoin")}
          </h3>
          <p className="text-xs text-destructive leading-relaxed">{error}</p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            {isAuthenticated &&
              errorState?.type === "api" &&
              getApiErrorCode(errorState.error) ===
                "ORG_INVITE_EMAIL_MISMATCH" && (
                <Button
                  type="button"
                  disabled={switchingAccount}
                  onClick={handleSwitchAccount}
                  className="text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  {switchingAccount ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {switchingAccount
                      ? t("join.switchingAccount")
                      : t("join.switchAccountButton")}
                  </span>
                </Button>
              )}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                router.push(isAuthenticated ? "/dashboard" : "/auth/login")
              }
              className="text-xs font-semibold"
            >
              {isAuthenticated ? t("join.goToDashboard") : t("common.back")}
            </Button>
          </div>
        </div>
      )}

      {/* Valid Invite Card */}
      {!loading && inviteData?.valid && !error && (
        <div className="space-y-4">
          {/* Organization Preview Card */}
          <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <OrganizationLogo
                name={inviteData.organization?.name}
                logoUrl={inviteData.organization?.logoUrl}
                size="lg"
                decorative
              />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {inviteData.organization?.name ||
                    t("common.organizationFallback")}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {inviteData.organization?.slug || "org"}
                </p>
              </div>
            </div>

            {/* Meta details */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="break-words">
                  {t("join.joinAs")}{" "}
                  <strong>{getOrgRoleLabel(inviteData.role, t)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="break-words">
                  {t("join.invitedBy")}{" "}
                  <strong>
                    {inviteData.createdByName ||
                      t("common.unknownUserFallback")}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Action Area: When NOT Logged In */}
          {!isAuthenticated ? (
            <div className="space-y-3 text-center">
              {inviteData.isEmailRestricted &&
                inviteData.maskedInvitedEmail && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground flex items-center justify-center gap-2 text-left">
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {t("join.emailRestrictedNotice", {
                        email: inviteData.maskedInvitedEmail,
                      })}
                    </span>
                  </div>
                )}
              <p className="text-xs text-muted-foreground">
                {t("join.signInPrompt")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/auth/login?redirect=${encodeURIComponent(`/auth/join/${token}`)}`,
                    )
                  }
                  className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  {t("join.signInButton")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/auth/register?redirect=${encodeURIComponent(`/auth/join/${token}`)}`,
                    )
                  }
                  className="h-10 border-input bg-background hover:bg-accent text-foreground font-semibold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  {t("join.createAccountButton")}
                </Button>
              </div>
            </div>
          ) : inviteData.emailMismatch ? (
            /* Action Area: Signed in with mismatched email */
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center space-y-3">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-foreground">
                  {t("join.emailMismatchTitle")}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {t("join.emailMismatchDesc", {
                    currentEmail: user?.email || "",
                    invitedEmail: inviteData.maskedInvitedEmail || "",
                  })}
                </p>
              </div>
              <Button
                type="button"
                disabled={switchingAccount}
                onClick={handleSwitchAccount}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {switchingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("join.switchingAccount")}</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>{t("join.switchAccountButton")}</span>
                  </>
                )}
              </Button>
            </div>
          ) : isAlreadyMember ? (
            /* Action Area: When Already a Member */
            <div className="space-y-3 text-center">
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {t("join.alreadyMember", {
                    org: inviteData.organization?.name || "",
                  })}
                </span>
              </div>
              <Button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer"
              >
                {t("join.goToDashboard")}
              </Button>
            </div>
          ) : (
            /* Action Area: When LOGGED IN and Not Member Yet */
            <div>
              <Button
                type="button"
                disabled={joining}
                onClick={handleJoin}
                className="w-full max-w-full overflow-hidden h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span className="truncate">{t("join.joiningButton")}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 truncate">
                      {t("join.joinOrgButton", {
                        org: inviteData.organization?.name || "",
                      })}
                    </span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
