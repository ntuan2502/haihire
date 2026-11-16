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
                          title={t("settings.rolesMatrix.adminRoleImmutable")}
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
                {category.permissions.map((permission) => {
                  const permissionLabel = getPermissionLabel(permission, t);
                  return (
                    <tr
                      key={permission}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {permissionLabel}
                      </td>
                      {ROLES.map(({ role, labelKey }) => {
                        const checked = isCellChecked(role, permission);
                        const disabled = isCellDisabled(role, permission);
                        const isAdminRole = role === Role.ADMIN;
                        const roleLabel = t(`settings.rolesMatrix.${labelKey}`);

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
                                onChange={() => onToggle(role, permission)}
                                title={
                                  isAdminRole
                                    ? t(
                                        "settings.rolesMatrix.adminRoleImmutable",
                                      )
                                    : `${roleLabel} - ${permissionLabel}`
                                }
                                aria-label={`${roleLabel}: ${permissionLabel}`}
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
