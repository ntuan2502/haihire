"use client";

import { useState, useMemo, Fragment } from "react";
import {
  useRolePermissionsMatrix,
  useUpdateRolePermissionsMutation,
  useResetRolePermissionsMutation,
} from "@/hooks/use-queries";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useI18n } from "@/i18n";
import { Role, type Permission } from "@haihire/shared";
import {
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  Save,
  Loader2,
  Lock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/shared";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";

const ROLES: Array<{
  role: Role;
  labelKey:
    | "roleAdmin"
    | "roleRecruiter"
    | "roleHiringManager"
    | "roleInterviewer"
    | "roleMember";
}> = [
  { role: Role.ADMIN, labelKey: "roleAdmin" },
  { role: Role.RECRUITER, labelKey: "roleRecruiter" },
  { role: Role.HIRING_MANAGER, labelKey: "roleHiringManager" },
  { role: Role.INTERVIEWER, labelKey: "roleInterviewer" },
  { role: Role.MEMBER, labelKey: "roleMember" },
];

interface PermissionCategory {
  categoryKey:
    | "categoryOrg"
    | "categoryJob"
    | "categoryCandidate"
    | "categoryApplication"
    | "categoryInterview"
    | "categorySourcing"
    | "categoryEmail"
    | "categorySettings";
  permissions: Permission[];
}

const CATEGORIES: PermissionCategory[] = [
  {
    categoryKey: "categoryOrg",
    permissions: [
      "org:view",
      "org:update",
      "org:delete",
      "org:manage_members",
      "org:manage_roles",
      "org:manage_billing",
      "org:transfer_ownership",
    ],
  },
  {
    categoryKey: "categoryJob",
    permissions: ["job:view", "job:create", "job:update", "job:delete"],
  },
  {
    categoryKey: "categoryCandidate",
    permissions: [
      "candidate:view",
      "candidate:view_basic",
      "candidate:create",
      "candidate:update",
      "candidate:delete",
      "candidate:document_upload",
      "candidate:document_download",
      "candidate:document_delete",
    ],
  },
  {
    categoryKey: "categoryApplication",
    permissions: [
      "application:view",
      "application:create",
      "application:update",
      "application:update_stage",
      "application:delete",
      "application:document_upload",
      "application:document_download",
      "application:document_delete",
    ],
  },
  {
    categoryKey: "categoryInterview",
    permissions: [
      "interview:view",
      "interview:create",
      "interview:update",
      "interview:delete",
      "interview:scorecard_submit",
    ],
  },
  {
    categoryKey: "categorySourcing",
    permissions: [
      "sourcing:view",
      "sourcing:create",
      "sourcing:update",
      "sourcing:delete",
    ],
  },
  {
    categoryKey: "categoryEmail",
    permissions: [
      "email:view",
      "email:send",
      "email:manage_templates",
      "email:manage_settings",
      "email:manage_system",
    ],
  },
  {
    categoryKey: "categorySettings",
    permissions: ["settings:manage_integrations"],
  },
];

export default function RolesPermissionsPage() {
  const { t } = useI18n();
  const canManageRoles = useHasPermission("org:manage_roles");

  const {
    data: serverMatrix,
    isLoading,
    isError,
    error,
  } = useRolePermissionsMatrix();
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

  return (
    <div className="flex-1 w-full space-y-6">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("settings.rolesMatrix.title")}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
              {t("settings.rolesMatrix.badge")}
            </span>
            {!canManageRoles && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                <Lock className="w-3 h-3" aria-hidden="true" />
                {t("settings.rolesMatrix.readOnlyBadge")}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("settings.rolesMatrix.description")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={
              !canManageRoles || isSaving || resetDefaultMutation.isPending
            }
            className="text-xs h-9 cursor-pointer"
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

          {canManageRoles && (
            <>
              {dirtyCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving || resetDefaultMutation.isPending}
                  className="text-xs h-9 cursor-pointer"
                >
                  <RotateCcw
                    className="w-3.5 h-3.5 mr-1.5"
                    aria-hidden="true"
                  />
                  {t("settings.rolesMatrix.resetButton")}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                disabled={
                  dirtyCount === 0 || isSaving || resetDefaultMutation.isPending
                }
                className="text-xs h-9 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
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
          )}
        </div>
      </div>

      {/* Read-Only Notice */}
      {!canManageRoles && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>{t("settings.rolesMatrix.readOnlyNotice")}</div>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {dirtyCount > 0 && canManageRoles && (
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-sm border-collapse"
              aria-label={t("settings.rolesMatrix.tableSummary")}
            >
              <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800 z-10">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-200 w-1/3 min-w-[240px]"
                  >
                    {t("settings.rolesMatrix.permissionColumn")}
                  </th>
                  {ROLES.map(({ role, labelKey }) => (
                    <th
                      key={role}
                      scope="col"
                      className="py-3.5 px-3 font-semibold text-center text-slate-700 dark:text-slate-200 min-w-[110px]"
                    >
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <span>{t(`settings.rolesMatrix.${labelKey}`)}</span>
                          {role === Role.ADMIN && (
                            <span
                              title={t(
                                "settings.rolesMatrix.adminRoleImmutable",
                              )}
                              aria-label={t(
                                "settings.rolesMatrix.adminRoleImmutable",
                              )}
                              className="inline-flex items-center cursor-help"
                            >
                              <Lock
                                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {role}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {CATEGORIES.map((category) => (
                  <Fragment key={category.categoryKey}>
                    {/* Category Header Row */}
                    <tr className="bg-slate-100/75 dark:bg-slate-800/40 border-t border-b border-slate-200/80 dark:border-slate-800">
                      <td
                        colSpan={ROLES.length + 1}
                        className="py-2 px-4 font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300"
                      >
                        {t(`settings.rolesMatrix.${category.categoryKey}`)}
                      </td>
                    </tr>

                    {/* Permission Rows */}
                    {category.permissions.map((permission) => (
                      <tr
                        key={permission}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {permission}
                        </td>
                        {ROLES.map(({ role, labelKey }) => {
                          const checked = isCellChecked(role, permission);
                          const disabled = isCellDisabled(role, permission);
                          const isAdminRole = role === Role.ADMIN;

                          return (
                            <td
                              key={`${role}-${permission}`}
                              className="py-2.5 px-3 text-center align-middle"
                            >
                              <div className="inline-flex items-center justify-center relative">
                                <input
                                  type="checkbox"
                                  id={`perm-${role}-${permission}`}
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() =>
                                    handleToggle(role, permission)
                                  }
                                  title={
                                    isAdminRole
                                      ? t(
                                          "settings.rolesMatrix.adminRoleImmutable",
                                        )
                                      : `${t(`settings.rolesMatrix.${labelKey}`)} - ${permission}`
                                  }
                                  aria-label={`${t(`settings.rolesMatrix.${labelKey}`)}: ${permission}`}
                                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:checked:bg-blue-600 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                />
                                {isAdminRole && (
                                  <Lock
                                    className="w-2.5 h-2.5 absolute -top-1 -right-2 text-slate-400 dark:text-slate-500 pointer-events-none"
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
