"use client";

import { useState, useMemo } from "react";
import {
  useRolePermissionsMatrix,
  useUpdateRolePermissionsMutation,
  useResetRolePermissionsMutation,
} from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { Role, type Permission } from "@haihire/shared";
import { ShieldCheck, RotateCcw, RefreshCw, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal, PageHeader, StatusState } from "@/components/shared";
import { toast } from "@/lib/toast";
import { getApiErrorMessage } from "@/lib/api-error";
import { RolesMatrixTable } from "@/components/settings/roles/roles-matrix-table";

export default function RolesPermissionsPage() {
  const { t } = useI18n();
  const canManageRoles = useHasPermission("org:manage_roles");

  const {
    data: serverMatrix,
    isLoading,
    isError,
    error,
  } = useRolePermissionsMatrix({ enabled: canManageRoles });
  const updateMutation = useUpdateRolePermissionsMutation();
  const resetDefaultMutation = useResetRolePermissionsMutation();

  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const dirtyCount = useMemo(() => {
    return Object.keys(overrides).length;
  }, [overrides]);

  const isCellChecked = (role: Role, permission: Permission): boolean => {
    if (role === Role.ADMIN) {
      return true;
    }
    const key = `${role}:${permission}`;
    if (key in overrides) {
      return overrides[key];
    }
    return Boolean(serverMatrix?.[role]?.[permission]);
  };

  const isCellDisabled = (role: Role, _permission: Permission): boolean => {
    if (!canManageRoles) {
      return true;
    }
    if (role === Role.ADMIN) {
      return true;
    }
    return false;
  };

  const handleToggle = (role: Role, permission: Permission) => {
    if (isCellDisabled(role, permission)) {
      return;
    }
    const key = `${role}:${permission}`;
    const currentValue = isCellChecked(role, permission);
    const newValue = !currentValue;
    const serverValue = Boolean(serverMatrix?.[role]?.[permission]);

    setOverrides((prev) => {
      const next = { ...prev };
      if (newValue === serverValue) {
        delete next[key];
      } else {
        next[key] = newValue;
      }
      return next;
    });
  };

  const handleReset = () => {
    setOverrides({});
  };

  const handleSave = async () => {
    if (dirtyCount === 0 || !canManageRoles) {
      return;
    }
    setIsSaving(true);

    try {
      // Group overrides by role
      const roleUpdates = new Map<
        Role,
        Array<{ permission: Permission; granted: boolean }>
      >();

      for (const [key, granted] of Object.entries(overrides)) {
        const colonIdx = key.indexOf(":");
        const roleStr = key.slice(0, colonIdx) as Role;
        if (roleStr === Role.ADMIN) {
          continue;
        }
        const permStr = key.slice(colonIdx + 1) as Permission;
        const list = roleUpdates.get(roleStr) || [];
        list.push({ permission: permStr, granted });
        roleUpdates.set(roleStr, list);
      }

      for (const [role, permissions] of roleUpdates.entries()) {
        await updateMutation.mutateAsync({ role, permissions });
      }

      setOverrides({});
      toast.success(t("settings.rolesMatrix.saveSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t) || t("settings.rolesMatrix.saveError"),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmResetToDefault = async () => {
    try {
      await resetDefaultMutation.mutateAsync();
      setOverrides({});
      setIsResetConfirmOpen(false);
      toast.success(t("settings.rolesMatrix.resetDefaultSuccess"));
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(err, t) ||
          t("settings.rolesMatrix.resetDefaultError"),
      );
    }
  };

  const headerActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsResetConfirmOpen(true)}
        disabled={isSaving || resetDefaultMutation.isPending}
        className="text-xs h-9 cursor-pointer rounded-xl"
      >
        {resetDefaultMutation.isPending ? (
          <Loader2
            className="w-3.5 h-3.5 mr-1.5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
        )}
        {t("settings.rolesMatrix.resetDefaultButton")}
      </Button>

      {dirtyCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isSaving || resetDefaultMutation.isPending}
          className="text-xs h-9 cursor-pointer rounded-xl"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          {t("settings.rolesMatrix.resetButton")}
        </Button>
      )}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={
          dirtyCount === 0 || isSaving || resetDefaultMutation.isPending
        }
        className="text-xs h-9 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
      >
        {isSaving ? (
          <>
            <Loader2
              className="w-3.5 h-3.5 mr-1.5 animate-spin"
              aria-hidden="true"
            />
            {t("settings.rolesMatrix.savingButton")}
          </>
        ) : (
          <>
            <Save className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t("settings.rolesMatrix.saveButton")}
          </>
        )}
      </Button>
    </>
  );

  if (!canManageRoles) {
    return (
      <div className="flex-1 w-full space-y-6 animate-in fade-in duration-200">
        <PageHeader
          title={t("settings.rolesMatrix.title")}
          subtitle={t("settings.rolesMatrix.description")}
          icon={ShieldCheck}
          bordered
        />
        <StatusState
          status="403"
          variant="card"
          actionLabel={t("settings.backToSettings")}
          actionHref="/dashboard/settings"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title={t("settings.rolesMatrix.title")}
        subtitle={t("settings.rolesMatrix.description")}
        icon={ShieldCheck}
        bordered
        actions={headerActions}
      />

      {/* Unsaved Changes Banner */}
      {dirtyCount > 0 && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 text-sm flex items-center justify-between shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">
              {t("settings.rolesMatrix.unsavedChanges")}
            </span>
          </div>
          <span className="text-xs bg-blue-200/70 dark:bg-blue-800/60 px-2 py-0.5 rounded-md font-semibold">
            {dirtyCount}
          </span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4 animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-md w-full animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div
          role="alert"
          className="p-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-center"
        >
          <p className="font-semibold">{t("settings.rolesMatrix.saveError")}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {getApiErrorMessage(error, t)}
          </p>
        </div>
      )}

      {/* Permissions Matrix Table */}
      {!isLoading && !isError && (
        <RolesMatrixTable
          isCellChecked={isCellChecked}
          isCellDisabled={isCellDisabled}
          onToggle={handleToggle}
        />
      )}

      {/* Reset to Default Confirmation Modal */}
      <CustomModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title={t("settings.rolesMatrix.resetDefaultConfirmTitle")}
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("settings.rolesMatrix.resetDefaultConfirmMessage")}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#202020] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsResetConfirmOpen(false)}
            disabled={resetDefaultMutation.isPending}
          >
            {t("settings.rolesMatrix.resetDefaultCancelButton")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmResetToDefault}
            disabled={resetDefaultMutation.isPending}
          >
            {resetDefaultMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : null}
            {t("settings.rolesMatrix.resetDefaultConfirmButton")}
          </Button>
        </div>
      </CustomModal>
    </div>
  );
}
