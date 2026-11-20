"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useAuth } from "@/context/auth-context";
import {
  useMyOrgs,
  useSwitchOrgMutation,
} from "@/hooks/use-organization-queries";
import { useI18n } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api-error";
import { getOrgRoleLabel } from "@/lib/roles";
import { toast } from "@/lib/toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function TeamSwitcher() {
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, isOwner } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const { data: organizations } = useMyOrgs({ enabled: Boolean(user) });
  const switchOrganization = useSwitchOrgMutation();
  const activeOrganization = user?.organization;
  const availableOrganizations = organizations?.length
    ? organizations
    : activeOrganization
      ? [activeOrganization]
      : [];

  const selectOrganization = async (id: string) => {
    if (id === user?.organizationId || switchOrganization.isPending) return;
    try {
      await switchOrganization.mutateAsync(id);
      setOpenMobile(false);
      router.push("/dashboard");
    } catch (error) {
      toast.error(getApiErrorMessage(error, t));
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <OrganizationLogo
                name={activeOrganization?.name}
                logoUrl={activeOrganization?.logoUrl}
                size="md"
                variant="sidebar"
                decorative
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrganization?.name ?? t("nav.organizationFallback")}
                </span>
                <span className="truncate text-xs">
                  {getOrgRoleLabel(isOwner ? "OWNER" : user?.role, t)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t("common.workspace")}
            </DropdownMenuLabel>
            {availableOrganizations.map((organization) => (
              <DropdownMenuItem
                key={organization.id}
                onSelect={() => void selectOrganization(organization.id)}
                disabled={switchOrganization.isPending}
                className="gap-2 p-2"
              >
                <OrganizationLogo
                  name={organization.name}
                  logoUrl={organization.logoUrl}
                  size="sm"
                  decorative
                />
                {organization.name}
                {organization.id === user?.organizationId && (
                  <DropdownMenuShortcut>
                    <Check
                      className="size-4"
                      aria-label={t("common.current")}
                    />
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onSelect={() => {
                setOpenMobile(false);
                router.push("/auth/onboarding?mode=create");
              }}
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                {t("nav.createOrganization")}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
