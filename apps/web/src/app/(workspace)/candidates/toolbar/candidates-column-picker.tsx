"use client";

import { useI18n } from "@/i18n";
import { ColumnPicker } from "@/components/shared/column-picker";

export interface CandidateVisibleColumns {
  name: boolean;
  email: boolean;
  phone: boolean;
  applications: boolean;
  added: boolean;
  quickNotes: boolean;
  [key: string]: boolean;
}

export interface CandidatesColumnPickerProps {
  visibleColumns: CandidateVisibleColumns;
  toggleColumn: (key: keyof CandidateVisibleColumns) => void;
}

export function CandidatesColumnPicker({
  visibleColumns,
  toggleColumn,
}: CandidatesColumnPickerProps) {
  const { t } = useI18n();

  const columns: Array<{
    key: keyof CandidateVisibleColumns;
    label: string;
    checked: boolean;
    disabled?: boolean;
  }> = [
    {
      key: "name",
      label: t("candidates.columns.name"),
      checked: visibleColumns.name,
      disabled: true,
    },
    {
      key: "email",
      label: t("candidates.columns.email"),
      checked: visibleColumns.email,
    },
    {
      key: "phone",
      label: t("candidates.columns.phone"),
      checked: visibleColumns.phone,
    },
    {
      key: "applications",
      label: t("candidates.columns.applications"),
      checked: visibleColumns.applications,
    },
    {
      key: "added",
      label: t("candidates.columns.added"),
      checked: visibleColumns.added,
    },
    {
      key: "quickNotes",
      label: t("candidates.columns.quickNotes"),
      checked: visibleColumns.quickNotes,
    },
  ];

  return (
    <ColumnPicker
      columns={columns.map((col) => ({
        ...col,
        key: String(col.key),
      }))}
      onToggle={(key) => toggleColumn(key as keyof CandidateVisibleColumns)}
      label={t("common.columns")}
      menuTitle={t("common.toggleColumns")}
      align="end"
    />
  );
}
