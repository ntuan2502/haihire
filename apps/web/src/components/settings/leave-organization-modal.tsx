"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { QueryClientContext } from "@tanstack/react-query";
import { ConfirmDestructiveModal } from "@/components/shared";
import { useAuth } from "@/context/auth-context";
import { useLeaveOrganizationMutation } from "@/hooks/use-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "@/lib/toast";

interface LeaveOrganizationModalProps {
  isOpen: boolean;
  organizationName?: string | null;
  onClose: () => void;
}

export function LeaveOrganizationModal({
  isOpen,
  organizationName,
  onClose,
}: LeaveOrganizationModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const queryClient = useContext(QueryClientContext) ?? null;
  const leaveOrgMutation = useLeaveOrganizationMutation();
  const [isFinalizingLeave, setIsFinalizingLeave] = useState(false);

  const orgLabel = organizationName || t("common.organizationFallback");

  const handleConfirmLeave = async () => {
    setIsFinalizingLeave(true);
    try {
      const res = await leaveOrgMutation.mutateAsync();
      queryClient?.clear();
      await refreshUser?.();
      toast.success(
        t("settings.leaveOrgSuccess", {
          name: res.organizationName || orgLabel,
        }),
      );
      onClose();
      if (res.nextOrganization) {
        router.replace("/dashboard");
      } else {
        router.replace("/auth/onboarding");
      }
    } catch (err) {
      console.error("Failed to leave organization:", err);
      toast.error(getApiErrorMessage(err, t));
    } finally {
      setIsFinalizingLeave(false);
    }
  };

  return (
    <ConfirmDestructiveModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirmLeave}
      title={t("settings.leaveOrgConfirmTitle", { name: orgLabel })}
      description={t("settings.leaveOrgConfirmDesc")}
      confirmButtonLabel={t("settings.leaveOrgButton")}
      cancelButtonLabel={t("common.cancel")}
      isLoading={leaveOrgMutation.isPending || isFinalizingLeave}
      variant="danger"
    />
  );
}
