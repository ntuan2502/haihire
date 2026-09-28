"use client";

import {
  LandingNavbar,
  LandingHero,
  LandingAtsPreview,
  LandingMetrics,
  LandingBentoGrid,
  LandingWorkflow,
  LandingComparison,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export default function HomePage() {
  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-[#030b1e] font-sans text-slate-900 dark:text-white selection:bg-cyan-500 selection:text-slate-950 transition-colors duration-300">
      {/* Dynamic Radial Atmosphere Glow Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.12),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.18),rgba(255,255,255,0))]" />
      <div className="pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1920px] h-[60vh] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.12)_0%,rgba(14,165,233,0.05)_35%,rgba(248,250,252,0)_75%)] dark:bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.25)_0%,rgba(14,165,233,0.1)_35%,rgba(3,11,30,0)_75%)] blur-3xl opacity-60" />

      {/* Sticky Glassmorphic Navbar */}
      <LandingNavbar />

      {/* Main Content Flow */}
      <main className="relative z-10 flex flex-col overflow-x-clip">
        {/* 1. Hero Section */}
        <LandingHero />

        {/* 2. Tangible ATS Live Interactive Window (Matching Real Internal Pipeline) */}
        <LandingAtsPreview />

        {/* 3. Performance Metrics Strip */}
        <LandingMetrics />

        {/* 4. Bento Grid Feature Ecosystem */}
        <LandingBentoGrid />

        {/* 5. 3-Step Streamlined Workflow */}
        <LandingWorkflow />

        {/* 6. Side-by-Side Comparison Table */}
        <LandingComparison />

        {/* 7. Bottom Conversion CTA Banner */}
        <LandingCta />
      </main>

      {/* 8. Comprehensive SaaS Footer */}
      <LandingFooter />
    </div>
  );
}
