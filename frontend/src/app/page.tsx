"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, Check, Briefcase } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useI18n } from "@/i18n";
import { LanguageDropdown } from "@/components/shared/language-dropdown";

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { t } = useI18n();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030b1e] font-sans text-white select-none">
      {/* Dynamic Radial Atmosphere Glow Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[160%] max-w-[1920px] h-[75vh] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.7)_0%,rgba(29,78,216,0.35)_40%,rgba(3,11,30,0)_75%)] blur-3xl opacity-80" />

      {/* Top Header / Navigation */}
      <header className="relative z-30 mx-auto flex h-20 max-w-7xl items-center justify-between px-6 sm:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-[#040d24]">
              <span className="font-black text-sm text-cyan-300">A</span>
            </div>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            ATS
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link
            href="/careers"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/15 shadow-sm transition-all hover:scale-105"
          >
            <Briefcase className="h-4 w-4 text-cyan-300" />
            <span>{t("landing.careers")}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </Link>

          {isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
              className="text-cyan-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
            >
              {user?.organization?.name
                ? `${t("landing.workspace")} (${user.organization.name})`
                : t("landing.createWorkspace")} &rarr;
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors font-medium"
            >
              {t("landing.signIn")}
            </Link>
          )}
        </nav>

        {/* Right CTA Button & Language Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/careers"
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white border border-white/10"
          >
            <Briefcase className="h-3.5 w-3.5 text-cyan-300" />
            <span>{t("landing.careers")}</span>
          </Link>
          <LanguageDropdown variant="landing" />

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg hover:bg-slate-100 hover:scale-105 transition-all"
            >
              {t("landing.enterDashboard")} &rarr;
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md hover:bg-slate-100 hover:scale-105 transition-all"
            >
              {t("landing.startFree")}
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-20 flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 pb-24 pt-8 sm:px-6 lg:px-8 text-center">
        {/* Eyebrow Pill */}
        <div className="mb-6 inline-flex items-center gap-2 tracking-[0.2em] text-[11px] font-extrabold uppercase text-blue-300/90 drop-shadow-sm">
          <Sparkles className="h-3 w-3 text-cyan-300" />
          {t("landing.applicantIntelligence")}
        </div>

        {/* Main Headline */}
        <h1 className="max-w-4xl text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.12] drop-shadow-md">
          {t("landing.heroTitlePart1")}
          <span className="inline-block rounded-2xl bg-white px-3.5 py-0.5 sm:px-5 sm:py-1 text-slate-950 shadow-2xl mx-1 align-baseline transform hover:scale-105 transition-transform">
            {t("landing.heroHiring")}
          </span>
          <br />
          {t("landing.heroTitlePart2")}
        </h1>

        {/* CTA Buttons Row */}
        <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3.5">
          {isAuthenticated ? (
            <Link
              href={user?.organizationId ? "/dashboard" : "/onboarding/create-org"}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-500 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <span>
                {user?.organization?.name
                  ? t("landing.goToWorkspace", { name: user.organization.name })
                  : user?.organizationId
                    ? t("landing.goToDashboard")
                    : t("landing.createWorkspace")}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-slate-950 shadow-xl shadow-white/10 hover:bg-slate-100 hover:scale-105 active:scale-95 transition-all"
              >
                {t("landing.startFree")} <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-blue-700/90 hover:bg-blue-600 border border-blue-400/30 px-7 py-3 text-sm font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {t("landing.signInToAts")}
              </Link>

              <Link
                href="/careers"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 px-6 py-3 text-sm font-bold text-cyan-300 shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                <Briefcase className="h-4 w-4 text-cyan-400" />
                <span>{t("landing.exploreCareers")}</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Badges */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-xs font-medium text-blue-200/80">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-cyan-300 stroke-[3]" />
            {t("landing.oneFreeRole")}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-cyan-300 stroke-[3]" />
            {t("landing.noCreditCard")}
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-cyan-300 stroke-[3]" />
            {t("landing.unlimitedApplicants")}
          </span>
        </div>

        {/* Glowing Earth Horizon Graphic */}
        <div className="pointer-events-none relative mt-12 sm:mt-16 w-full max-w-5xl overflow-visible">
          {/* Globe Curve Edge */}
          <div className="relative mx-auto h-48 sm:h-72 w-full">
            {/* Luminous atmospheric arc */}
            <div className="absolute inset-x-0 bottom-0 h-40 sm:h-64 rounded-t-[100%] bg-gradient-to-b from-cyan-400/30 via-blue-600/40 to-transparent border-t-2 border-cyan-300/70 shadow-[0_-20px_80px_rgba(56,189,248,0.5)]" />

            {/* Glowing world mesh dots and particle lines SVG */}
            <svg
              className="absolute inset-x-0 -bottom-4 w-full h-full opacity-60 mix-blend-screen"
              viewBox="0 0 1000 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Curved latitude arcs */}
              <path
                d="M 50 280 Q 500 40 950 280"
                stroke="rgba(147, 197, 253, 0.4)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <path
                d="M 120 280 Q 500 80 880 280"
                stroke="rgba(191, 219, 254, 0.5)"
                strokeWidth="1"
              />
              <path
                d="M 200 280 Q 500 130 800 280"
                stroke="rgba(147, 197, 253, 0.3)"
                strokeWidth="1"
              />

              {/* Node interconnection points */}
              <circle cx="280" cy="180" r="3" fill="#67e8f9" />
              <circle cx="360" cy="150" r="2.5" fill="#93c5fd" />
              <circle cx="500" cy="125" r="4" fill="#ffffff" />
              <circle cx="640" cy="155" r="3" fill="#67e8f9" />
              <circle cx="720" cy="190" r="2.5" fill="#93c5fd" />
              <circle cx="430" cy="160" r="2" fill="#38bdf8" />
              <circle cx="570" cy="165" r="2.5" fill="#38bdf8" />

              {/* Glowing node connector beams */}
              <line x1="280" y1="180" x2="360" y2="150" stroke="rgba(103, 232, 249, 0.5)" strokeWidth="1" />
              <line x1="360" y1="150" x2="500" y2="125" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.2" />
              <line x1="500" y1="125" x2="640" y2="155" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.2" />
              <line x1="640" y1="155" x2="720" y2="190" stroke="rgba(103, 232, 249, 0.5)" strokeWidth="1" />
              <line x1="360" y1="150" x2="430" y2="160" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="0.8" />
              <line x1="500" y1="125" x2="570" y2="165" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="0.8" />
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
}
