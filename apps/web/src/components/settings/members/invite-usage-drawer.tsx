"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  OverlayCloseButton,
  createOverlayDismissGuard,
} from "@/components/shared/overlay-primitives";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useI18n } from "@/i18n";
import { useLocalization } from "@/components/providers/localization-provider";
import { useInviteLinkUsages } from "@/hooks/use-queries";
import { getOrgRoleLabel } from "@/lib/roles";
import { formatDateTime } from "@/lib/utils";
import type { InviteLink } from "@/types";
import { Link2, Shield, Users } from "lucide-react";

interface InviteUsageDrawerProps {
  link: InviteLink | null;
  isOpen: boolean;
  onClose: () => void;
  getRoleLabel?: (role: string) => string;
}

export function InviteUsageDrawer({
  link,
  isOpen,
  onClose,
  getRoleLabel,
}: InviteUsageDrawerProps) {
  const { t } = useI18n();
  const { localization } = useLocalization();
  const { data: usages = [], isLoading } = useInviteLinkUsages(
    link?.id ?? null,
    { enabled: isOpen && Boolean(link) },
  );

  const resolveRoleLabel = (role: string) =>
    getRoleLabel ? getRoleLabel(role) : getOrgRoleLabel(role, t);

  const resolvedUsages =
    usages.length > 0 ? usages : (link?.recentUsages ?? []);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        {...createOverlayDismissGuard()}
        className="w-full sm:max-w-md flex flex-col"
      >
        <SheetHeader className="border-b border-border pb-4 pr-12">
          <div className="flex items-center gap-2 text-foreground">
            <Link2
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <SheetTitle className="text-sm font-semibold">
              {t("members.usageHistoryTitle")}
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            {t("members.usageHistorySubtitle")}
          </SheetDescription>

          {link && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Shield className="h-3 w-3" aria-hidden="true" />
                <span>{resolveRoleLabel(link.role)}</span>
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {t("members.usesCount", {
                  used: link.usesCount,
                  max: link.maxUses !== null ? link.maxUses : "∞",
                })}
              </Badge>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {isLoading && resolvedUsages.length === 0 ? (
            <div className="py-8">
              <LoadingSpinner />
            </div>
          ) : resolvedUsages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("members.noLinkUsages")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {resolvedUsages.map((usage) => (
                <div
                  key={usage.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      name={usage.userName}
                      avatarUrl={usage.userAvatarUrl}
                      size="sm"
                      rounded="full"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {usage.userName}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {usage.userEmail}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {t("members.joinedAtLabel", {
                          date: formatDateTime(usage.usedAt, localization),
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <OverlayCloseButton primitive="sheet" />
      </SheetContent>
    </Sheet>
  );
}
