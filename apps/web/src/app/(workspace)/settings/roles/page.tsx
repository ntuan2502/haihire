"use client";

import { SettingsButton } from "@/components/settings/settings-button";
import { useState, useMemo } from "react";
import {
  useRolePermissionsMatrix,
  useUpdateRolePermissionsMutation,
  useResetRolePermissionsMutation,
} from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { Role, type Permission } from "@haihire/shared";
import { ShieldCheck, RotateCcw, RefreshCw, Save } from "lucide-react";
import {
  ConfirmDestructiveModal,
  LoadingSpinner,
  PageHeader,
  StatusState,
} from "@/components/shared";
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
      <SettingsButton
        variant="outline"
        size="sm"
        onClick={() => setIsResetConfirmOpen(true)}
        disabled={isSaving || resetDefaultMutation.isPending}
        icon={RefreshCw}
        pending={resetDefaultMutation.isPending}
      >
        {t("settings.rolesMatrix.resetDefaultButton")}
      </SettingsButton>

      {dirtyCount > 0 && (
        <SettingsButton
          variant="outline"
          size="sm"
          onClick={handleReset}
          icon={RotateCcw}
          disabled={isSaving || resetDefaultMutation.isPending}
        >
          {t("settings.rolesMatrix.resetButton")}
        </SettingsButton>
      )}
      <SettingsButton
        size="sm"
        onClick={handleSave}
        icon={Save}
        pending={isSaving}
        disabled={
          dirtyCount === 0 || isSaving || resetDefaultMutation.isPending
        }
      >
        {t(
          isSaving
            ? "settings.rolesMatrix.savingButton"
            : "settings.rolesMatrix.saveButton",
        )}
      </SettingsButton>
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
          actionHref="/settings"
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
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
          className="p-3.5 rounded-lg border border-border bg-muted/60 text-foreground text-sm flex items-center justify-between shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              className="w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="font-medium">
              {t("settings.rolesMatrix.unsavedChanges")}
            </span>
          </div>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-md font-semibold">
            {dirtyCount}
          </span>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div
          role="alert"
          className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-center"
        >
          <p className="font-semibold">{t("settings.rolesMatrix.saveError")}</p>
          <p className="text-xs text-destructive/80 mt-1">
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
      <ConfirmDestructiveModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleConfirmResetToDefault}
        title={t("settings.rolesMatrix.resetDefaultConfirmTitle")}
        description={t("settings.rolesMatrix.resetDefaultConfirmMessage")}
        confirmButtonLabel={t("settings.rolesMatrix.resetDefaultConfirmButton")}
        cancelButtonLabel={t("settings.rolesMatrix.resetDefaultCancelButton")}
        isLoading={resetDefaultMutation.isPending}
        variant="warning"
      />
    </div>
  );
}
