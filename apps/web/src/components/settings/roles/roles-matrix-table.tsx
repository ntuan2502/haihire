"use client";

import { Fragment } from "react";
import { Role, type Permission } from "@haihire/shared";
import { Lock } from "lucide-react";
import { useI18n } from "@/i18n";
import { getPermissionLabel } from "@/lib/roles";
import { ROLES, CATEGORIES } from "./role-matrix-constants";

interface RolesMatrixTableProps {
  isCellChecked: (role: Role, permission: Permission) => boolean;
  isCellDisabled: (role: Role, permission: Permission) => boolean;
  onToggle: (role: Role, permission: Permission) => void;
}

export function RolesMatrixTable({
  isCellChecked,
  isCellDisabled,
  onToggle,
}: RolesMatrixTableProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm border-collapse"
          aria-label={t("settings.rolesMatrix.tableSummary")}
        >
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b border-border z-10">
            <tr>
              <th
                scope="col"
                className="py-3.5 px-4 font-semibold text-foreground sticky left-0 z-10 min-w-36 max-w-[148px] bg-muted border-r border-border sm:min-w-[240px] sm:max-w-none md:w-1/3"
              >
                {t("settings.rolesMatrix.permissionColumn")}
              </th>
              {ROLES.map(({ role, labelKey }) => (
                <th
                  key={role}
                  scope="col"
                  className="py-3.5 px-3 font-semibold text-center text-foreground min-w-[110px]"
                >
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <span>{t(`settings.rolesMatrix.${labelKey}`)}</span>
                      {role === Role.ADMIN && (
                        <span
                          title={t("settings.rolesMatrix.adminRoleImmutable")}
                          aria-label={t(
                            "settings.rolesMatrix.adminRoleImmutable",
                          )}
                          className="inline-flex items-center cursor-help"
                        >
                          <Lock
                            className="w-3.5 h-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CATEGORIES.map((category) => (
              <Fragment key={category.categoryKey}>
                {/* Category Header Row */}
                <tr className="bg-muted/50 border-y border-border">
                  <td
                    colSpan={ROLES.length + 1}
                    className="py-2 px-4 font-semibold text-xs text-muted-foreground"
                  >
                    <span className="sticky left-4 inline-block">
                      {t(`settings.rolesMatrix.${category.categoryKey}`)}
                    </span>
                  </td>
                </tr>

                {/* Permission Rows */}
                {category.permissions.map((permission) => {
                  const permissionLabel = getPermissionLabel(permission, t);
                  return (
                    <tr
                      key={permission}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-1 bg-card px-4 py-2.5 text-xs font-medium text-foreground max-w-[148px] sm:max-w-none border-r border-border break-words"
                      >
                        {permissionLabel}
                      </th>
                      {ROLES.map(({ role, labelKey }) => {
                        const checked = isCellChecked(role, permission);
                        const disabled = isCellDisabled(role, permission);
                        const isAdminRole = role === Role.ADMIN;
                        const roleLabel = t(`settings.rolesMatrix.${labelKey}`);

                        return (
                          <td
                            key={`${role}-${permission}`}
                            className="px-3 text-center align-middle"
                          >
                            <label className="relative inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center has-disabled:cursor-not-allowed">
                              <input
                                type="checkbox"
                                id={`perm-${role}-${permission}`}
                                checked={checked}
                                disabled={disabled}
                                onChange={() => onToggle(role, permission)}
                                title={
                                  isAdminRole
                                    ? t(
                                        "settings.rolesMatrix.adminRoleImmutable",
                                      )
                                    : `${roleLabel} - ${permissionLabel}`
                                }
                                aria-label={`${roleLabel}: ${permissionLabel}`}
                                className="h-4 w-4 rounded border-input accent-primary focus-visible:ring-ring disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
