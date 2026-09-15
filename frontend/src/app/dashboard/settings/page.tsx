"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  useMyOrg,
  useUpdateMyOrgMutation,
  useDeleteMyOrgMutation,
} from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { useI18n } from "@/i18n";

export default function GeneralSettingsPage() {
  const router = useRouter();
  const { user, updateUserOrg, logout, canEdit, isOwner } = useAuth();
  const { t } = useI18n();
  const { data: org, isLoading: isOrgLoading } = useMyOrg();
  const updateOrgMutation = useUpdateMyOrgMutation();
  const deleteOrgMutation = useDeleteMyOrgMutation();

  // Form states
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [appHost, setAppHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppHost(window.location.host);
    }
  }, []);

  const displayHost = appHost || "localhost:3000";

  // Sync org data into form state
  useEffect(() => {
    if (org) {
      setOrgName(org.name || "");
      setOrgSlug(org.slug || "");
    } else if (user?.organization) {
      setOrgName(user.organization.name || "");
      setOrgSlug(user.organization.slug || "");
    }
  }, [org, user]);

  // Handle saving organization profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);

    const trimmedName = orgName.trim();
    const trimmedSlug = orgSlug.toLowerCase().trim();

    if (!trimmedName) {
      setSaveError("Organization name is required.");
      return;
    }
    if (!trimmedSlug) {
      setSaveError("URL slug is required.");
      return;
    }

    try {
      const updated = await updateOrgMutation.mutateAsync({
        name: trimmedName,
        slug: trimmedSlug,
      });

      if (updated) {
        updateUserOrg(updated);
      }

      setSaveSuccess("Organization profile updated successfully.");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? ((err as { response?: { data?: { message?: string } } }).response
              ?.data?.message ?? "Failed to update organization profile.")
          : "Failed to update organization profile.";
      setSaveError(message);
    }
  };

  // Handle deleting organization
  const handleDeleteOrg = async () => {
    if (deleteConfirmText.toLowerCase() !== orgSlug.toLowerCase()) {
      return;
    }

    try {
      await deleteOrgMutation.mutateAsync();
      setDeleteModalOpen(false);
      logout();
      router.push("/onboarding/create-org");
    } catch (err) {
      console.error("Failed to delete organization:", err);
      setSaveError("Failed to delete organization. Please try again.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          {t("settings.tabs.general")}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t("settings.tabs.generalSub")}
        </p>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      {/* CARD 1: Organization profile */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
        {/* Card Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100 dark:bg-blue-950/60 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("settings.tabs.generalSub")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("settings.workspace")}
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Organization name */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("settings.workspaceName")}
            </label>
            <Input
              type="text"
              placeholder="e.g. Acme Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="h-10 text-xs bg-slate-50/50 dark:bg-slate-950"
              required
              disabled={!canEdit || isOrgLoading || updateOrgMutation.isPending}
            />
          </div>

          {/* URL slug */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
              {t("settings.urlSlug")}
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
              <span className="px-3 py-2 bg-slate-100/80 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-medium select-none border-r border-slate-200 dark:border-slate-800 shrink-0">
                {displayHost}/
              </span>
              <input
                type="text"
                placeholder="company-slug"
                value={orgSlug}
                onChange={(e) =>
                  setOrgSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, ""),
                  )
                }
                className="flex-1 h-10 px-3 text-xs bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                required
                disabled={!canEdit || isOrgLoading || updateOrgMutation.isPending}
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
              {t("settings.slugHint")}
            </p>
          </div>

          {/* Save Button (Admins only) */}
          <div className="pt-2">
            {canEdit ? (
              <Button
                type="submit"
                disabled={isOrgLoading || updateOrgMutation.isPending}
                className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {updateOrgMutation.isPending
                  ? t("common.loading")
                  : t("settings.saveChanges")}
              </Button>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Shield className="h-4 w-4 shrink-0" />
                <span>{t("settings.readOnlyAdmin")}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* CARD 2: Danger zone (Owner only) */}
      {isOwner && (
        <div className="rounded-2xl border border-rose-200/80 bg-white dark:bg-slate-900 dark:border-rose-950/60 p-6 shadow-xs space-y-4">
          {/* Danger Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-100 dark:bg-rose-950/60 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {t("settings.dangerZone")}
              </h3>
              <p className="text-xs text-rose-500/80 dark:text-rose-400/80">
                {t("settings.dangerZoneDesc")}
              </p>
            </div>
          </div>

          <div className="border-t border-rose-100 dark:border-rose-950/60 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t("settings.deleteOrg")}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t("settings.deleteOrgDesc")}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(true)}
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold px-3.5 py-1.5 rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{t("common.delete")}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ================= DELETE ORGANIZATION CONFIRMATION MODAL ================= */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("settings.deleteOrg")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("settings.dangerZoneDesc")}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("settings.deleteOrgConfirmPrompt", { slug: orgSlug })}
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("settings.deleteOrgTypeToConfirm", { slug: orgSlug })}:
              </label>
              <Input
                type="text"
                placeholder={orgSlug}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText("");
                }}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={
                  deleteConfirmText.toLowerCase() !== orgSlug.toLowerCase() ||
                  deleteOrgMutation.isPending
                }
                onClick={handleDeleteOrg}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-4"
              >
                {deleteOrgMutation.isPending
                  ? t("settings.deletingOrg")
                  : t("settings.deleteOrgButton")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
