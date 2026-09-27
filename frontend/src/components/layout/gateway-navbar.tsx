"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { LogIn, ArrowRight } from "lucide-react";
import { cn } from "cn";

export interface GatewayNavbarProps {
  className?: string;
  maxWidthClassName?: string;
}

export function GatewayNavbar({
  className,
  maxWidthClassName = "max-w-7xl",
}: GatewayNavbarProps) {
  const pathname = usePathname() || "";
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  const isLoginPage = pathname.startsWith("/login");
  const isRegisterPage = pathname.startsWith("/register");
  const isAuthPage = isLoginPage || isRegisterPage;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full h-16 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 transition-colors select-none",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4",
          maxWidthClassName,
        )}
      >
        {/* Left: Brand Identity with link to home */}
        <Link
          href="/"
          className="hover:opacity-90 transition-opacity focus:outline-hidden"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Right: Controls & User Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <LanguageDropdown />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <span>{t("landing.enterDashboard")}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <UserMenu />
            </div>
          ) : (
            !isAuthPage && (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-950 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{t("landing.signIn")}</span>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
