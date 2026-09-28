"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageDropdown } from "@/components/shared/language-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { useAuth } from "@/context/auth-context";
import { Menu, X } from "lucide-react";
import { cn } from "cn";

export interface GatewayNavbarProps {
  className?: string;
  maxWidthClassName?: string;
}

export function GatewayNavbar({
  className,
  maxWidthClassName = "max-w-7xl",
}: GatewayNavbarProps) {
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors select-none",
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

          {/* Right: Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Theme & Language */}
            <div className="hidden md:flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageDropdown />
            </div>

            {/* Authenticated user menu if already logged in */}
            {isAuthenticated && user && <UserMenu />}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 stroke-[2]" />
              ) : (
                <Menu className="h-5 w-5 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Only Theme & Language change) */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
