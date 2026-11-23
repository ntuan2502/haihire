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
} from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel } from "@/lib/roles";
import { toast } from "@/lib/toast";

interface PublicInviteData {
  valid: boolean;
  token?: string;
  role?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
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
        setError(getApiErrorMessage(err, t, "auth.invalidInvitation"));
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
      setError(
        t("join.alreadyMember", { org: inviteData?.organization?.name || "" }),
      );
      return;
    }
    try {
      setJoining(true);
      setError(null);
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
      setError(getApiErrorMessage(err, t));
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
          <div className="pt-2">
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
      {!loading && inviteData?.valid && (
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
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  {t("join.joinAs")}{" "}
                  <strong>{getOrgRoleLabel(inviteData.role, t)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
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
              <p className="text-xs text-muted-foreground">
                {t("join.signInPrompt")}
              </p>
              <div className="grid grid-cols-2 gap-3">
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
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-md shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("join.joiningButton")}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>
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
