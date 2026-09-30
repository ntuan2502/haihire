"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import type { TrackingLinkItem } from "@haihire/shared";
import { useUpdateTrackingLinkMutation } from "@/hooks/use-sourcing-queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/shared/custom-select";
import { Pencil } from "lucide-react";

interface EditLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: TrackingLinkItem;
}

export function EditLinkModal({
  isOpen,
  onClose,
  link,
}: EditLinkModalProps) {
  const { t } = useI18n();
  const updateMutation = useUpdateTrackingLinkMutation();

  const [name, setName] = useState(link.name);
  const [isActive, setIsActive] = useState<boolean>(link.isActive);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(link.name);
      setIsActive(link.isActive);
      setError(null);
    }
  }, [isOpen, link]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("sourcing.modal.nameRequired"));
      return;
    }

    updateMutation.mutate(
      {
        id: link.id,
        data: {
          name: name.trim(),
          isActive,
        },
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  const statusOptions = [
    { value: "true", label: t("sourcing.details.editStatusActive") },
    { value: "false", label: t("sourcing.details.editStatusInactive") },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <DialogHeader className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Pencil className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {t("sourcing.details.editTitle")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {link.name} ({link.token})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Link Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.details.editNameLabel")}
                <span className="text-rose-500 ml-1">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                  error
                    ? "border-rose-300 dark:border-rose-700"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              />
              {error && <p className="text-[11px] text-rose-500">{error}</p>}
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("sourcing.details.editStatusLabel")}
              </label>
              <CustomSelect
                value={isActive ? "true" : "false"}
                options={statusOptions}
                onChange={(val) => setIsActive(val === "true")}
                className="w-full"
                triggerClassName="w-full text-xs h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="h-9 px-4 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              {t("sourcing.modal.cancelBtn")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updateMutation.isPending}
              className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              {updateMutation.isPending
                ? t("sourcing.details.editSaving")
                : t("sourcing.details.editSave")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
